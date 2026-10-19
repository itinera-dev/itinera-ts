import { describe, expect, it } from "vitest";
import { contribution, type StepScript, unscripted } from "../step.js";
import { nonValue, scripted } from "../value.js";
import { contributedUnder, globalMetadataUnder } from "./given-under.js";

describe("what a step's script gives under a key", () => {
  function scriptUnderKeys(): StepScript {
    const script = unscripted();
    script.actions.push(
      contribution("total", "1"),
      contribution("total", "2 and then changes it to 3"),
      contribution("other", "4"),
      { kind: "contribute", key: "total", value: nonValue },
      {
        kind: "set global metadata",
        key: "tenant",
        value: scripted('"acme"'),
      },
      { kind: "set global metadata", key: "total", value: scripted("9") },
    );
    script.attempts = [
      { outcome: { kind: "success" }, contributes: [["total", 5]] },
      { outcome: { kind: "success" }, contributes: [["other", 6]] },
    ];
    return script;
  }

  it("lists every value it contributes under the key, as written, on any attempt", () => {
    expect(contributedUnder(scriptUnderKeys(), "total")).toEqual([1, 2, 3, 5]);
  });

  it("lists every value it sets as global metadata under the key", () => {
    expect(globalMetadataUnder(scriptUnderKeys(), "tenant")).toEqual(["acme"]);
  });
});
