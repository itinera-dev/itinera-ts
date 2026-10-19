import { describe, expect, it } from "vitest";
import type { Checked } from "../declaration/request.js";
import type { AdapterName } from "../workflow.js";
import { None, Some } from "../option.js";
import { DefaultDispatcher } from "../report/default-dispatcher.js";
import { Attempt, type StepName } from "../step.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import type { PlainValue } from "../value.js";
import { integer, listOf, string } from "../value/token.js";
import { caught, journeyThrough } from "./fixtures.js";
import type { Journey } from "./journey.js";
import { byAdapter, byStep, type Requesting, requested } from "./request.js";

const charge = "charge" as StepName;
const required: Checked = { schema: integer, optional: false };
const optional: Checked = { schema: integer, optional: true };
const byCharge = byStep(charge, Attempt.first);
const byPricing = byAdapter("pricing" as AdapterName, charge, Attempt.first);

function recording(): [Journey, RecordingReporter] {
  const recorder = new RecordingReporter();
  const dispatcher = new DefaultDispatcher();
  dispatcher.add(recorder);
  return [journeyThrough(dispatcher), recorder];
}

async function resolved(
  type: Checked,
  found: PlainValue | undefined,
  requesting: Requesting = byCharge,
): Promise<[unknown, Journey, RecordingReporter]> {
  const [journey, recorder] = recording();
  const value = await requested(
    journey,
    requesting,
    "amount",
    type,
    found,
  ).catch(caught);
  return [value, journey, recorder];
}

describe("requested", () => {
  it.each<[string, Checked, unknown]>([
    ["the value to a required request", required, 42],
    ["Some of the value to an optional request", optional, Some(42)],
  ])("gives %s", async (_, type, expected) => {
    const [value] = await resolved(type, 42);
    expect(value).toEqual(expected);
  });

  it("gives an optional request Some of a null stored", async () => {
    const [value] = await resolved(
      { schema: string.nullable(), optional: true },
      null,
    );
    expect(value).toEqual(Some(null));
  });

  it("gives the requester its own copy of the value", async () => {
    const stored = [1, 2];
    const [value] = await resolved(
      { schema: listOf(integer), optional: false },
      stored,
    );
    expect(value).toEqual(stored);
    expect(value).not.toBe(stored);
  });

  it("gives an optional request without a value None, which optional_input_absent reports", async () => {
    const [value, , recorder] = await resolved(optional, undefined);
    expect(value).toBe(None);
    expect(recorder.events).toMatchObject([
      {
        kind: "optional_input_absent",
        key: "amount",
        requester: { kind: "step", step: "charge", attempt: Attempt.first },
      },
    ]);
  });

  it("names the input adapter that made an optional request without a value", async () => {
    const [, , recorder] = await resolved(optional, undefined, byPricing);
    expect(recorder.events).toMatchObject([
      {
        requester: {
          kind: "adapter",
          adapter: "pricing",
          step: "charge",
          attempt: Attempt.first,
        },
      },
    ]);
  });

  it.each<[string, Requesting, unknown]>([
    ["a step", byCharge, { kind: "step" }],
    ["an input adapter", byPricing, { kind: "adapter", adapter: "pricing" }],
  ])(
    "aborts the journey with required data missing for a required request without a value, naming %s",
    async (_, requesting, requester) => {
      const [thrown, journey, recorder] = await resolved(
        required,
        undefined,
        requesting,
      );
      expect(thrown).toMatchObject({ abort: journey.recorded });
      expect(journey.recorded).toEqual({
        reason: "required data missing",
        step: "charge",
        missing: { kind: "key", key: "amount", requester },
      });
      expect(recorder.events).toEqual([]);
    },
  );

  it.each<[string, Checked]>([
    ["required", required],
    ["optional", optional],
  ])(
    "aborts the journey with wrong type for a value of another type, when the request is %s",
    async (_, type) => {
      const [, journey] = await resolved(type, "forty-two", byPricing);
      expect(journey.recorded).toEqual({
        reason: "wrong type",
        step: "charge",
        key: "amount",
        requester: { kind: "adapter", adapter: "pricing" },
      });
    },
  );
});
