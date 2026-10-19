import { describe, it } from "vitest";
import type { StepFailureCause } from "../../policy.js";
import { contributor } from "../../journey/contributor.js";
import { input } from "../../step/request.js";
import { integer, string } from "../../value/token.js";
import { Tally } from "../fixtures.js";
import type { OnSuccess } from "../lifecycle.js";
import { failureCause, fromStep, retryCause } from "../request.js";
import { StepPolicy } from "../step-policy.js";

describe("a step policy's builder", () => {
  it("compiles with a method of the class and its requests, in order", () => {
    Tally.builder()
      .onStepSuccess("counted", fromStep("note", string), contributor())
      .onStepFailure("failed", failureCause())
      .onStepRetry("retried", retryCause());
  });

  it("does not compile with a field", () => {
    // @ts-expect-error a field is not a method
    Tally.builder().onStepSuccess("field");
  });

  it("does not compile with a name the class does not have", () => {
    // @ts-expect-error Tally has no method named missing
    Tally.builder().onStepSuccess("missing");
  });

  it("does not compile with a failure hook that may finish the workflow", () => {
    class Lenient extends StepPolicy {
      forgiven(cause: StepFailureCause): OnSuccess {
        return cause === "retries exhausted"
          ? this.finishWorkflow()
          : this.keepDefault();
      }
    }
    // @ts-expect-error a failure hook cannot finish the workflow
    Lenient.builder().onStepFailure("forgiven", failureCause());
  });

  it("does not compile with a request that gives what its parameter does not accept", () => {
    Tally.builder().onStepSuccess(
      "counted",
      // @ts-expect-error a step's note is a string
      fromStep("note", integer),
      contributor(),
    );
  });

  it("does not compile with a parameter left without a request", () => {
    // @ts-expect-error counted takes two parameters
    Tally.builder().onStepSuccess("counted", fromStep("note", string));
  });

  it("does not compile with a request a step policy cannot make", () => {
    Tally.builder().onStepSuccess(
      "counted",
      // @ts-expect-error only a step reads the journey's inputs
      input("note", string),
      contributor(),
    );
  });
});
