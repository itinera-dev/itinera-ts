import { describe, expect, it } from "vitest";
import { requestsOf } from "../../../src/declaration.js";
import type { Option } from "../../../src/option.js";
import { integer, optional, string } from "../../../src/value/token.js";
import type { Reason } from "../../../src/step.js";
import {
  failureReason,
  input,
  stepReporter,
} from "../../../src/step/request.js";
import type { StepReporter } from "../../../src/step/request.js";
import {
  fromRescuedStep,
  RescueStep,
  rescueStep,
  type RescueOutcome,
  requestsOfRescue,
} from "../../../src/step/rescue.js";
import { Recount } from "../../fixtures/step.js";

@rescueStep()
class Refund extends RescueStep {
  constructor(
    @input("order", string) readonly order: string,
    @failureReason({ optional: true }) readonly reason: Option<Reason>,
  ) {
    super();
  }

  override async run(
    @stepReporter() reporter: StepReporter,
  ): Promise<RescueOutcome> {
    await reporter.info(`refunding ${this.order}`);
    return this.succeed();
  }
}

class Undeclared extends RescueStep {
  override run(): RescueOutcome {
    return this.succeed();
  }
}

describe("rescueStep", () => {
  it("records what the constructor and run request", () => {
    expect(requestsOfRescue(Refund)).toEqual({
      needs: [
        {
          kind: "input",
          key: "order",
          type: { schema: string, optional: false },
        },
        { kind: "failureReason", optional: true },
      ],
      run: [{ kind: "stepReporter" }],
    });
  });

  it("leaves a class it does not mark undeclared", () => {
    expect(requestsOfRescue(Undeclared)).toBeUndefined();
  });

  it("refuses a class that extends another rescue step", () => {
    class Express extends Refund {}
    expect(() => {
      rescueStep()(Express);
    }).toThrow("Express must extend RescueStep itself");
  });

  it("refuses a class that keeps static data", () => {
    expect(() => {
      // @ts-expect-error a rescue step keeps no static data
      rescueStep()(Recount);
    }).toThrow(
      `rescue step Recount keeps static data, which everything built from it would share: rescues`,
    );
  });

  it("refuses a class declared twice", () => {
    expect(() => {
      rescueStep()(Refund);
    }).toThrow("Refund is declared with @rescueStep twice");
  });

  it("refuses a parameter of run with no request", () => {
    class Pack extends RescueStep {
      override run(box: string): RescueOutcome {
        return box === "" ? this.succeed() : this.succeed();
      }
    }
    expect(() => {
      rescueStep()(Pack);
    }).toThrow("Pack.run: parameter 1 carries no request");
  });
});

describe("RescueStep", () => {
  it("succeeds with the outcome of a step that did its work", () => {
    expect(new Undeclared().run()).toEqual({ kind: "success" });
  });
});

describe("fromRescuedStep", () => {
  class Retry extends RescueStep {
    constructor(
      @fromRescuedStep("charged", integer) readonly charged: number,
      @fromRescuedStep("coupon", optional(integer))
      readonly coupon: Option<number>,
      @fromRescuedStep("payment") readonly payment: string,
    ) {
      super();
    }

    override run(): RescueOutcome {
      return this.succeed();
    }
  }

  it.each([
    ["a type written", 0, "charged", integer, false],
    ["a type optional wraps", 1, "coupon", integer, true],
    ["a type read from the metadata", 2, "payment", string, false],
  ])("records the key and %s", (_, index, key, schema, optional) => {
    expect(requestsOf(Retry, undefined)[index]).toEqual({
      kind: "fromRescuedStep",
      key,
      type: { schema, optional },
    });
  });
});

describe("RescueStep.builder", () => {
  it("refuses a class that keeps static data", () => {
    // @ts-expect-error a rescue step keeps no static data
    expect(() => Recount.builder()).toThrow(
      `rescue step Recount keeps static data, which everything built from it would share: rescues`,
    );
  });
});
