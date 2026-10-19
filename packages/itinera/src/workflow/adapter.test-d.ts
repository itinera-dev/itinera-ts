import { describe, expectTypeOf, it } from "vitest";
import type { DataBag, JourneyId } from "../journey.js";
import { dataBag, journeyId } from "../journey/request.js";
import { StepPolicy } from "../policy/step-policy.js";
import type { StepName } from "../step.js";
import { stepName } from "../step/request.js";
import { string } from "../value/token.js";
import { Workflow } from "../workflow.js";
import { inputAdapter, key, type Supplied } from "./adapter.js";
import { fromWorkflow } from "./request.js";

describe("inputAdapter", () => {
  it("compiles on a method of a workflow that supplies a value or reads the data bag", () => {
    class Orders extends Workflow {
      @inputAdapter({ steps: ["charge"] })
      price(
        @stepName() step: StepName,
        @key() key: string,
        @fromWorkflow("order", string) order: string,
        @journeyId() id: JourneyId,
        @dataBag() bag: DataBag,
      ): Supplied {
        return bag.keys().includes(key)
          ? this.fromDataBag()
          : this.supply(`${step} ${order} ${id}`);
      }

      @inputAdapter({ steps: ["ship"] })
      async address(): Promise<Supplied> {
        return Promise.resolve(this.fromDataBag());
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });

  it("does not compile on a method that returns anything else", () => {
    class Orders extends Workflow {
      // @ts-expect-error an input adapter returns this.supply(value) or this.fromDataBag()
      @inputAdapter({ steps: ["charge"] })
      price(): number {
        return 40;
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });

  it("does not compile outside a workflow", () => {
    class Audit extends StepPolicy {
      // @ts-expect-error only a workflow has input adapters
      @inputAdapter({ steps: ["charge"] })
      price(): Supplied {
        return { kind: "fromDataBag" };
      }
    }
    expectTypeOf(Audit).toBeConstructibleWith();
  });

  it("does not compile attached to no step", () => {
    class Orders extends Workflow {
      // @ts-expect-error an input adapter is attached to one step or more
      @inputAdapter({ steps: [] })
      price(): Supplied {
        return this.fromDataBag();
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });

  it("supplies only a value", () => {
    class Orders extends Workflow {
      @inputAdapter({ steps: ["charge"] })
      price(): Supplied {
        // @ts-expect-error a function is not a value
        return this.supply(() => 40);
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });
});

describe("key and dataBag", () => {
  it("do not compile on a parameter of another type, or outside a workflow", () => {
    class Orders extends Workflow {
      @inputAdapter({ steps: ["charge"] })
      price(
        // @ts-expect-error a key is a string
        @key() key: number,
        // @ts-expect-error the data bag is not a string
        @dataBag() bag: string,
      ): Supplied {
        return this.supply(`${String(key)} ${bag}`);
      }
    }
    class Audit extends StepPolicy {
      audited(
        // @ts-expect-error only an input adapter is asked for an input
        @key() key: string,
        // @ts-expect-error a hook is not given the data bag
        @dataBag() bag: DataBag,
      ): string {
        return `${key} ${String(bag.keys().length)}`;
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
    expectTypeOf(Audit).toBeConstructibleWith();
  });
});
