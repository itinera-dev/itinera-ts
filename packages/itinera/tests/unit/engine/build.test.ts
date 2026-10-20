import { describe, expect, it } from "vitest";
import { AbortReason, type Abort } from "../../../src/journey.js";
import { DefaultDispatcher } from "../../../src/report/default-dispatcher.js";
import { Attempt, Step, type StepDescriptor, type StepName } from "../../../src/step.js";
import { failureReason, input, stepName } from "../../../src/step/request.js";
import type { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import { rescueStepMock } from "../../../src/testing/rescue-step-mock.js";
import { stepMock } from "../../../src/testing/step-mock.js";
import { Ending } from "../../../src/testing/ending.js";
import { integer, string } from "../../../src/value/token.js";
import { key } from "../../../src/workflow/adapter.js";
import type { Supplied } from "../../../src/workflow/adapter/supplied.js";
import { built } from "../../../src/engine/build.js";
import { ofStep } from "../../../src/engine/buildable.js";
import {
  type Adapting,
  caught,
  journeyThrough,
  keeping,
  orders,
  recorded,
  Shop,
} from "../../fixtures/engine.js";

/** The step `charge`, whose constructor's arguments are kept in `needs`. */
function charge(needs: unknown[][] = []) {
  return keeping(needs).builder("charge");
}

function lastEvent(recorder: RecordingReporter): unknown {
  return recorder.events.at(-1);
}

function adapted(adapting: Adapting) {
  return Shop.builder()
    .name("orders")
    .step(charge().needs(input("amount", integer)))
    .inputAdapter(
      "adapt",
      { steps: ["charge"], name: "pricing" },
      stepName(),
      key(),
    )
    .constructWith(adapting)
    .build();
}

const diskFull: Abort = {
  reason: AbortReason.ReporterFailed,
  step: "charge" as StepName,
  errorMessage: "disk full",
  error: new Error("disk full"),
};

describe("built", () => {
  it("gives the constructor each input, in the order it declares them, read from the data bag", async () => {
    const needs: unknown[][] = [];
    await recorded(
      orders(
        charge(needs).needs(
          input("amount", integer),
          input("currency", string),
        ),
      ),
      { currency: "EUR", amount: 42 },
    );
    expect(needs).toEqual([[42, "EUR"]]);
  });

  it("aborts the journey with required data missing for a required input without a value, before the step is built", async () => {
    const needs: unknown[][] = [];
    const recorder = await recorded(
      orders(charge(needs).needs(input("amount", integer))),
    );
    expect(needs).toEqual([]);
    expect(lastEvent(recorder)).toMatchObject({
      abort: {
        reason: "required data missing",
        step: "charge",
        missing: { kind: "key", key: "amount", requester: { kind: "step" } },
      },
    });
  });

  it("stops at the first input that aborts the journey", async () => {
    const recorder = await recorded(
      orders(
        charge().needs(input("amount", integer), input("currency", string)),
      ),
      { amount: "ten" },
    );
    expect(recorder.events.map((event) => event.kind)).toEqual([
      "journey_started",
      "attempt_started",
      "journey_aborted",
    ]);
    expect(lastEvent(recorder)).toMatchObject({
      abort: { reason: "wrong type", key: "amount" },
    });
  });

  it("names the input adapter in wrong type when the adapter supplied the value", async () => {
    const recorder = await recorded(adapted((shop) => shop.supplying("ten")));
    expect(lastEvent(recorder)).toMatchObject({
      abort: {
        reason: "wrong type",
        step: "charge",
        key: "amount",
        requester: { kind: "adapter", adapter: "pricing" },
      },
    });
  });

  it.each([
    ["wrong type", { amount: "ten" }],
    ["required data missing", {}],
  ])(
    "names no input adapter in %s for an input the adapter supplied nothing for",
    async (reason, data) => {
      const recorder = await recorded(
        adapted((shop) => shop.reading()),
        data,
      );
      expect(lastEvent(recorder)).toMatchObject({ abort: { reason } });
      expect(JSON.stringify(lastEvent(recorder))).not.toContain("pricing");
    },
  );

  it("builds the step with the value its input adapter supplied", async () => {
    const needs: unknown[][] = [];
    await recorded(
      Shop.builder()
        .name("orders")
        .step(charge(needs).needs(input("amount", integer)))
        .inputAdapter("adapt", { steps: ["charge"], name: "pricing" })
        .constructWith((shop) => shop.supplying(7))
        .build(),
      { amount: 42 },
    );
    expect(needs).toEqual([[7]]);
  });

  it("aborts the journey with step could not be built when the constructor fails", async () => {
    const unbuildable = stepMock({
      attempts: [Ending.success],
      buildFailure: "no connection",
    });
    const recorder = await recorded(orders(unbuildable.builder("charge")));
    expect(recorder.events.map((event) => event.kind)).toEqual([
      "journey_started",
      "attempt_started",
      "journey_aborted",
    ]);
    expect(lastEvent(recorder)).toMatchObject({
      abort: {
        reason: "step could not be built",
        step: "charge",
        source: { kind: "step" },
        errorMessage: "no connection",
      },
    });
  });

  it("aborts the journey with step could not be built for a request a step's constructor cannot make", async () => {
    const recorder = await recorded(
      orders(charge().needs(failureReason() as never)),
    );
    expect(lastEvent(recorder)).toMatchObject({
      abort: {
        reason: "step could not be built",
        source: { kind: "step" },
        errorMessage:
          "the constructor of step charge requests @failureReason, which its constructor cannot request",
      },
    });
  });

  it("passes on an abort raised while a step is built as it was raised", async () => {
    const journey = journeyThrough(new DefaultDispatcher());
    let raised: unknown;
    class AbortingWhileBuilt extends Step {
      constructor() {
        super();
        raised = journey.abort(diskFull);
        throw raised;
      }

      override run(): never {
        throw new Error("never run");
      }
    }
    const instance = orders(AbortingWhileBuilt.builder("charge")).instance();
    const step = instance.descriptor.steps().at(0) as StepDescriptor;
    const thrown = await built(
      journey,
      instance,
      ofStep(step),
      Attempt.first,
    ).catch(caught);
    expect(thrown).toBe(raised);
  });

  it.each<[string, readonly [string, ...string[]], string]>([
    [
      "the step and its rescue step",
      ["charge", "charge_rescue"],
      "charge_rescue",
    ],
    ["only the step", ["charge"], "from the data bag"],
  ])(
    "asks the input adapter attached to %s for the rescue step's inputs only under the rescue step's own name",
    async (_, steps, rescueReceived) => {
      const needs: unknown[][] = [];
      class Charge extends stepMock({
        attempts: [Ending.failure("expired"), Ending.success],
      }) {
        constructor(...given: unknown[]) {
          super(...given);
          needs.push(given);
        }
      }
      class Rescue extends rescueStepMock({ attempts: [Ending.success] }) {
        constructor(...given: unknown[]) {
          super(...given);
          needs.push(given);
        }
      }
      const workflow = Shop.builder()
        .name("orders")
        .step(
          Charge.builder("charge")
            .needs(input("caller", string))
            .rescue(Rescue.builder().needs(input("caller", string))),
        )
        .inputAdapter("adapt", { steps, name: "callers" }, stepName())
        .constructWith(namedBy)
        .build();
      await recorded(workflow, { caller: "from the data bag" });
      expect(needs).toEqual([["charge"], [rescueReceived], ["charge"]]);
    },
  );
});

/** Supplies the name of the step being built. */
function namedBy(shop: Shop, step: unknown): Supplied {
  return shop.supplying(String(step));
}
