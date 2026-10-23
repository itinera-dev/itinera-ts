import { describe, expectTypeOf, it } from "vitest";
import { Level } from "../../../src/testing/emitted.js";
import type {
  AttemptScript,
  NamedStep,
  Script,
  StepScript,
} from "../../../src/testing/scripted.js";

declare const script: Script;
declare const named: NamedStep;
declare const attempts: AttemptScript;
declare const ended: StepScript;

describe("scripted", () => {
  it("contributes, emits and sets global metadata only in that order", () => {
    expectTypeOf(attempts.willEmit(Level.Info, "charging")).not.toHaveProperty(
      "willContribute",
    );
    expectTypeOf(
      attempts.willSetGlobalMetadata("user_id", "u-7"),
    ).not.toHaveProperty("willEmit");
  });

  it("ends the attempts chosen before choosing others, naming a step or running", () => {
    const acting = attempts.willContribute("charged", 40);
    expectTypeOf(acting).not.toHaveProperty("onAttempt");
    expectTypeOf(acting).not.toHaveProperty("andStep");
    expectTypeOf(acting).not.toHaveProperty("run");
  });

  it("describes nothing more of the attempts chosen once they end", () => {
    expectTypeOf(ended).not.toHaveProperty("willSucceed");
    expectTypeOf(ended).not.toHaveProperty("willContribute");
  });

  it("names a step only to describe it", () => {
    expectTypeOf(named).not.toHaveProperty("run");
    expectTypeOf(named).not.toHaveProperty("andStep");
    expectTypeOf(script).not.toHaveProperty("onAttempt");
  });

  it("takes only values", () => {
    // @ts-expect-error a function is not a value
    attempts.willContribute("charged", () => 40);
    // @ts-expect-error a date is not a value
    attempts.willEmit(Level.Info, "charging", new Date());
    // @ts-expect-error a symbol is not a value
    attempts.willSetGlobalMetadata("user_id", Symbol("u-7"));
  });

  it("chooses attempts again once the attempts chosen end", () => {
    expectTypeOf<
      StepScript["onAttempt"]
    >().returns.toEqualTypeOf<AttemptScript>();
  });
});
