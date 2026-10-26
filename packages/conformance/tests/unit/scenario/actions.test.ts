import type { Contributor } from "itinera/journey";
import type { StepReporter } from "itinera/step";
import { describe, expect, it } from "vitest";
import { ModelError } from "../../../src/model/error.js";
import {
  contribution,
  emit,
  type StepScript,
  unscripted,
} from "../../../src/model/step.js";
import { scripted } from "../../../src/model/value.js";
import { actingOf } from "../../../src/scenario/actions.js";

class Kept implements Contributor, StepReporter {
  readonly calls: unknown[][] = [];
  readonly contributed: unknown[] = [];

  constructor(private readonly failing = false) {}

  contribute(key: string, value: unknown): void {
    this.calls.push(["contribute", key, structuredClone(value)]);
    this.contributed.push(value);
  }

  info(message: string): Promise<void> {
    return this.called("info", message);
  }

  warning(message: string): Promise<void> {
    return this.called("warning", message);
  }

  error(message: string): Promise<void> {
    return this.called("error", message);
  }

  setGlobalMetadata(key: string, value: unknown): Promise<void> {
    return this.called("set global metadata", key, value);
  }

  private called(...call: unknown[]): Promise<void> {
    this.calls.push(call);
    return this.failing
      ? Promise.reject(new Error("the reporter failed"))
      : Promise.resolve();
  }
}

/** Plays the script's first attempt with `inputs`, through `kept`. */
async function played(
  script: StepScript,
  kept: Kept,
  inputs: readonly unknown[] = [],
  attempt = 0,
): Promise<void> {
  await actingOf(script)?.({
    attempt,
    inputs,
    contributor: kept,
    reporter: kept,
  });
}

function changingItems(): StepScript {
  const script = unscripted();
  script.inputs.push({ key: "items", type: "list", optional: false });
  return script;
}

describe("what a scripted step does before it ends", () => {
  it("does nothing when the script does nothing before the attempt ends", () => {
    expect(actingOf(unscripted())).toBeUndefined();
  });

  it("plays its actions in the order written, then the attempt's contributions", async () => {
    const script = unscripted();
    script.actions.push(
      emit("info", "charging", null),
      contribution("receipt", '"R-1"'),
      { kind: "set global metadata", key: "user_id", value: scripted('"u-7"') },
    );
    script.attempts = [
      { outcome: { kind: "success" }, contributes: [["total", 40]] },
    ];
    const kept = new Kept();
    await played(script, kept);
    expect(kept.calls).toEqual([
      ["info", "charging"],
      ["contribute", "receipt", "R-1"],
      ["set global metadata", "user_id", "u-7"],
      ["contribute", "total", 40],
    ]);
  });

  it.each([
    ["the first attempt", 0, 1],
    ["the second attempt", 1, 2],
    ["an attempt past the last row, which repeats it", 4, 2],
  ])(
    "contributes what the row of the attempt says: %s",
    async (_, attempt, total) => {
      const script = unscripted();
      script.attempts = [
        { outcome: { kind: "success" }, contributes: [["total", 1]] },
        { outcome: { kind: "success" }, contributes: [["total", 2]] },
      ];
      const kept = new Kept();
      await played(script, kept, [], attempt);
      expect(kept.calls).toEqual([["contribute", "total", total]]);
    },
  );

  it("changes what it contributed after contributing it", async () => {
    const script = unscripted();
    script.actions.push(
      contribution(
        "items",
        '["book", "pen"] and then changes it to ["nothing"]',
      ),
    );
    const kept = new Kept();
    await played(script, kept);
    expect(kept.calls).toEqual([["contribute", "items", ["book", "pen"]]]);
    expect(kept.contributed).toEqual([["nothing"]]);
  });

  it.each([
    ["a list", ["book", "pen"], '["nothing"]', ["nothing"]],
    ["an object", { book: 1 }, '{"pen": 2}', { pen: 2 }],
    ["a string, which stays as it is", "book", '"pen"', "book"],
  ])(
    "changes an input in place, as far as it can: %s",
    async (_, input, written, changed) => {
      const script = changingItems();
      script.actions.push({
        kind: "change input",
        key: "items",
        value: scripted(written),
      });
      const inputs = [input];
      await played(script, new Kept(), inputs);
      expect(inputs[0]).toEqual(changed);
    },
  );

  it("refuses to change an input the step never requests, as an error in the case", () => {
    const script = unscripted();
    script.actions.push({
      kind: "change input",
      key: "items",
      value: scripted("[]"),
    });
    expect(() => actingOf(script)).toThrow(ModelError);
  });

  it("ends at an emit that fails", async () => {
    const script = unscripted();
    script.actions.push(
      emit("info", "first", null),
      emit("info", "second", null),
    );
    const kept = new Kept(true);
    await expect(played(script, kept)).rejects.toThrow("the reporter failed");
    expect(kept.calls).toEqual([["info", "first"]]);
  });

  it("carries on after an emit that fails when the script ignores failed emits", async () => {
    const script = unscripted();
    script.ignoresFailedEmits = true;
    script.actions.push(
      emit("info", "first", null),
      emit("info", "second", null),
    );
    const kept = new Kept(true);
    await played(script, kept);
    expect(kept.calls).toEqual([
      ["info", "first"],
      ["info", "second"],
    ]);
  });
});
