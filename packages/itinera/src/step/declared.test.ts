import { describe, expect, it } from "vitest";
import { type Outcome, Step, step } from "../step.js";
import { isDeclared } from "./declared.js";
import { Ship } from "./fixtures.js";

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

  it("refuses a class that extends another step", () => {
    class Express extends Ship {}
    expect(() => {
      step()(Express);
    }).toThrow("Express must extend Step itself");
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
    }).toThrow("the constructor of Weigh has a parameter with no request");
  });

  it("refuses a parameter of run with no request", () => {
    class Pack extends Step {
      override run(box: string): Outcome {
        return box === "" ? this.succeed() : this.succeed();
      }
    }
    expect(() => {
      step()(Pack);
    }).toThrow("Pack.run has a parameter with no request");
  });
});
