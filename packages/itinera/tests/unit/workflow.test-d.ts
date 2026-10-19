import { describe, expectTypeOf, it } from "vitest";
import { type DataBag, dataBag, type JourneyId, journeyId } from "../../src/journey.js";
import type { Reporter } from "../../src/report.js";
import type { Outcome } from "../../src/step.js";
import { Ship } from "../fixtures/step.js";
import {
  type AdapterName,
  idGenerator,
  withStep,
  Workflow,
  workflow,
  type WorkflowName,
} from "../../src/workflow.js";

declare function naming(workflow: WorkflowName): void;
declare function adapting(adapter: AdapterName): void;

describe("WorkflowName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a workflow name
    naming("orders");
  });
});

describe("AdapterName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not an adapter name
    adapting("pricing");
  });
});

describe("workflow", () => {
  it("marks only a class extending Workflow", () => {
    // @ts-expect-error the class does not extend Workflow
    @workflow({ name: "orders" })
    class Shop {
      readonly shop = "corner";
    }
    expectTypeOf(Shop).toBeConstructibleWith();
  });

  it("lists only reporters built without arguments", () => {
    class Tagged implements Reporter {
      constructor(readonly tag: string) {}

      report(): void {}
    }
    // @ts-expect-error the reporter's constructor takes an argument
    @workflow({ name: "orders", reporters: [Tagged] })
    class Shop extends Workflow {}
    expectTypeOf(Shop).toBeConstructibleWith();
  });
});

describe("withStep", () => {
  it("lists only a class extending Step", () => {
    class Pack {
      run(): Outcome {
        return { kind: "success" };
      }
    }
    // @ts-expect-error Pack does not extend Step
    @withStep(Pack, { name: "pack" })
    class Shop extends Workflow {}
    expectTypeOf(Shop).toBeConstructibleWith();
  });

  it("marks only a class extending Workflow", () => {
    // @ts-expect-error the class does not extend Workflow
    @withStep(Ship, { name: "ship" })
    class Shop {
      readonly shop = "corner";
    }
    expectTypeOf(Shop).toBeConstructibleWith();
  });
});

describe("idGenerator", () => {
  it("marks a method returning a string", () => {
    class Shop extends Workflow {
      // @ts-expect-error a journey ID is a string
      @idGenerator()
      orderId(): number {
        return 1;
      }
    }
    expectTypeOf(Shop).toBeConstructibleWith();
  });

  it("marks a synchronous method", () => {
    class Shop extends Workflow {
      // @ts-expect-error the ID is made synchronously
      @idGenerator()
      orderId(): Promise<string> {
        return Promise.resolve("order-1");
      }
    }
    expectTypeOf(Shop).toBeConstructibleWith();
  });

  it("marks a method taking the data bag", () => {
    class Shop extends Workflow {
      @idGenerator()
      orderId(@dataBag() data: DataBag): string {
        return data.keys().join("-");
      }
    }
    expectTypeOf(Shop).toBeConstructibleWith();
  });

  it("marks a method taking nothing but the data bag", () => {
    class Shop extends Workflow {
      // @ts-expect-error an ID generator requests only the data bag
      @idGenerator()
      orderId(@journeyId() id: JourneyId): string {
        return id;
      }
    }
    expectTypeOf(Shop).toBeConstructibleWith();
  });

  it("marks only a method of a class extending Workflow", () => {
    class Shop {
      // @ts-expect-error the class does not extend Workflow
      @idGenerator()
      orderId(): string {
        return "order-1";
      }
    }
    expectTypeOf(Shop).toBeConstructibleWith();
  });
});
