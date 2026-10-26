import { LocalExecutor } from "itinera/executor";
import type { JourneyResult } from "itinera/journey";
import { MistakeKind, TestMistake } from "itinera/testing";
import { describe, expect, it } from "vitest";
import { Fakes } from "../../src/fakes.js";
import { admitted } from "../../src/journeys.js";
import { Model } from "../../src/model.js";
import type { Fake } from "../../src/model/testing.js";
import { Recorders } from "../../src/recorders.js";
import { instanceOf } from "../../src/scenario.js";
import { Witness } from "../../src/witness.js";

/**
 * The workflow `orders`, whose step `charge`, attempted twice, requests the
 * labeller `labels` that the provider `stock` makes for each attempt, run
 * `journeys` times with `fake` in place of `stock`, with the result of each,
 * what the step was lent and how many times the fake was called.
 */
async function charged(fake: Fake, journeys = 1) {
  const model = new Model();
  model.declare("orders", ["charge"]);
  model.step("charge").services.push({ key: "labels", type: "labeller" });
  model.step("charge").retries = 1;
  model.ends("charge", [
    {
      outcome: { kind: "failure", reason: { code: "declined" } },
      contributes: [],
    },
  ]);
  model.providers.declare(
    "stock",
    { key: "labels", type: "labeller" },
    "attempt",
  );
  const witness = new Witness(model.policies.roles, model.providers);
  const admission = admitted(model, witness);
  if (admission.kind === "refused") {
    throw admission.violations;
  }
  const fakes = new Fakes();
  const executor = new LocalExecutor();
  const results: JourneyResult[] = [];
  for (let journey = 0; journey < journeys; journey += 1) {
    const instance = fakes.given(
      instanceOf(admission.workflow, model, new Recorders(new Map())),
      new Map([["stock", fake]]),
    );
    results.push(await executor.run(instance));
  }
  return {
    results,
    lent: witness.lent("charge"),
    calls: fakes.callsTo("stock"),
  };
}

describe("Fakes", () => {
  it("labels each instance a fake makes with how many calls the fake has had in the journey", async () => {
    const { lent, calls } = await charged({
      kind: "makes",
      implementation: "second labeller",
    });
    expect(lent).toMatchObject([{ label: "fake 1" }, { label: "fake 2" }]);
    expect(calls).toBe(2);
  });

  it("counts the calls of every journey, each journey labelling from 1", async () => {
    const { lent, calls } = await charged(
      { kind: "makes", implementation: "second labeller" },
      2,
    );
    expect(lent).toMatchObject([
      { label: "fake 1" },
      { label: "fake 2" },
      { label: "fake 1" },
      { label: "fake 2" },
    ]);
    expect(calls).toBe(4);
  });

  it("counts a call that fails, which aborts the journey", async () => {
    const { results, calls } = await charged({
      kind: "fails",
      message: "stock closed",
    });
    expect(results.map(statusKind)).toEqual(["aborted"]);
    expect(calls).toBe(1);
  });

  it("throws the test mistake of a fake making another service than its provider", async () => {
    await expect(charged({ kind: "makes meters" })).rejects.toThrow(
      new TestMistake([
        { kind: MistakeKind.AnotherService, provider: "stock" },
      ]),
    );
  });
});

function statusKind(result: JourneyResult): string {
  return result.status.kind;
}
