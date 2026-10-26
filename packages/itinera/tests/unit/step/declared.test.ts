import { describe, expect, it } from "vitest";
import { type Outcome, Step, step } from "../../../src/step.js";
import { integer } from "../../../src/value/token.js";
import { isDeclared, requestsOfStep } from "../../../src/step/declared.js";
import { input } from "../../../src/step/request.js";
import { Counter, Ship } from "../../fixtures/step.js";

class Undeclared extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

describe("step", () => {
  it("declares the class it marks", () => {
    expect(isDeclared(Ship)).toBe(true);
  });

  it("leaves a class it does not mark undeclared", () => {
    expect(isDeclared(Undeclared)).toBe(false);
  });

  it("records what the constructor and run request", () => {
    @step()
    class Weigh extends Step {
      constructor(@input("grams", integer) readonly grams: number) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expect(requestsOfStep(Weigh)).toEqual({
      needs: [
        {
          kind: "input",
          key: "grams",
          type: { schema: integer, optional: false },
        },
      ],
      run: [],
    });
  });

  it("refuses a class that extends another step", () => {
    class Express extends Ship {}
    expect(() => {
      step()(Express);
    }).toThrow("Express must extend Step itself");
  });

  it("refuses a class that keeps static data", () => {
    expect(() => {
      // @ts-expect-error a step keeps no static data
      step()(Counter);
    }).toThrow(
      `step Counter keeps static data, which everything built from it would share: attempts`,
    );
  });

  it("refuses a class that keeps static data no type can see", () => {
    class Tally extends Step {
      private static tallied = 0;

      override run(): Outcome {
        Tally.tallied += 1;
        return this.succeed();
      }
    }
    expect(() => {
      step()(Tally);
    }).toThrow(
      `step Tally keeps static data, which everything built from it would share: tallied`,
    );
  });

  it("refuses a class declared twice", () => {
    expect(() => {
      step()(Ship);
    }).toThrow("Ship is declared with @step twice");
  });

  it("refuses a constructor parameter with no request", () => {
    class Weigh extends Step {
      constructor(readonly grams: number) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expect(() => {
      step()(Weigh);
    }).toThrow("the constructor of Weigh: parameter 1 carries no request");
  });

  it("refuses a parameter of run with no request", () => {
    class Pack extends Step {
      override run(box: string): Outcome {
        return box === "" ? this.succeed() : this.succeed();
      }
    }
    expect(() => {
      step()(Pack);
    }).toThrow("Pack.run: parameter 1 carries no request");
  });
});
