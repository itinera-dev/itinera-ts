import { describe, expectTypeOf, it } from "vitest";
import type {
  Abort,
  AbortReason,
  DataBag,
  Failure,
  FailureCause,
  JourneyId,
  JourneyResult,
} from "../../src/journey.js";
import type { StepName } from "../../src/step.js";

declare function identifying(journeyId: JourneyId): void;
declare function aborting(reason: AbortReason): void;
declare function failing(cause: FailureCause): void;
declare function explaining(abort: Abort): void;
declare function failingWith(failure: Failure): void;

describe("JourneyId", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a journey ID
    identifying("journey-1");
  });
});

describe("AbortReason", () => {
  it("is only one of its values", () => {
    aborting("reporter failed");
    // @ts-expect-error not a value of the set
    aborting("reporter crashed");
  });
});

describe("FailureCause", () => {
  it("is only one of its values", () => {
    failing("retries exhausted");
    // @ts-expect-error not a value of the set
    failing("retry budget exhausted");
  });
});

describe("Abort", () => {
  it("carries the error exactly when it carries the message", () => {
    const step = "charge" as StepName;
    explaining({
      reason: "step could not be built",
      step,
      source: { kind: "step" },
    });
    // @ts-expect-error a message without the error that carried it
    explaining({
      reason: "step could not be built",
      step,
      source: { kind: "step" },
      errorMessage: "down",
    });
    // @ts-expect-error an error without its message
    explaining({
      reason: "step could not be built",
      step,
      source: { kind: "step" },
      error: new Error("down"),
    });
    // @ts-expect-error a failed reporter's abort always carries the error
    explaining({ reason: "reporter failed", errorMessage: "down" });
    expectTypeOf<
      Extract<Abort, { reason: "required data missing" }>
    >().not.toHaveProperty("error");
  });
});

describe("Failure", () => {
  it("never carries both a reason and an error", () => {
    // @ts-expect-error a failure explained by an error has no reason
    failingWith({
      cause: "abnormal termination",
      error: new Error("down"),
      errorMessage: "down",
      reason: { code: "declined" },
    });
  });
});

describe("JourneyResult", () => {
  it("gives the data bag only once its status says the journey did not abort", () => {
    const result = {} as JourneyResult;
    // @ts-expect-error an aborted journey has no data bag
    expectTypeOf(result.status.dataBag).toEqualTypeOf<DataBag>();
    if (result.isSucceeded() || result.isFailed()) {
      expectTypeOf(result.status.dataBag).toEqualTypeOf<DataBag>();
    }
  });
});
