import { describe, expectTypeOf, it } from "vitest";
import type { Reporter } from "../../../src/report.js";
import { type Outcome, Step, type StepClass } from "../../../src/step.js";
import { type Built, Workflow } from "../../../src/workflow.js";
import type { IdGeneratorKey } from "../../../src/workflow/builder.js";

class Shop extends Workflow {
  readonly opened = "today";

  constructor(readonly shop: string) {
    super();
  }

  orderId(): string {
    return `${this.shop}-1`;
  }

  orderNumber(): number {
    return 1;
  }

  withPrefix(prefix: string): string {
    return prefix;
  }
}

class Kiosk extends Workflow {
  constructor(readonly kiosk = "station") {
    super();
  }
}

describe("WorkflowBuilder", () => {
  it("builds a built workflow object of the class", () => {
    expectTypeOf(
      Shop.builder().name("shop").constructWith("corner").build(),
    ).toEqualTypeOf<Built<Shop>>();
  });

  it("does not build before it has the constructor's arguments", () => {
    // @ts-expect-error the constructor of Shop takes a string
    Shop.builder().name("shop").build();
  });

  it("builds straight away when the constructor needs no argument", () => {
    expectTypeOf(Kiosk.builder().name("kiosk").build()).toEqualTypeOf<
      Built<Kiosk>
    >();
  });

  it("takes the arguments of the class's constructor", () => {
    // @ts-expect-error the constructor of Shop takes a string
    Shop.builder().constructWith(3);
  });

  it("cannot put Workflow itself together", () => {
    // @ts-expect-error Workflow is abstract
    Workflow.builder();
  });

  it("takes only a class extending Step as a step", () => {
    class Pack {
      run(): Outcome {
        return { kind: "success" };
      }
    }
    expectTypeOf(Pack).not.toExtend<StepClass>();
    // @ts-expect-error Pack does not extend Step
    Step.builder.call(Pack, "pack");
  });

  it("cannot put Step itself together", () => {
    // @ts-expect-error Step is abstract
    Step.builder("step");
  });

  it("takes only reporters built without arguments", () => {
    class Tagged implements Reporter {
      constructor(readonly tag: string) {}

      report(): void {}
    }
    // @ts-expect-error the reporter's constructor takes an argument
    Shop.builder().reporter(Tagged);
  });

  it("takes as ID generator a method of the class", () => {
    expectTypeOf<IdGeneratorKey<Shop>>().toEqualTypeOf<"orderId">();
  });

  it("takes as ID generator no field", () => {
    // @ts-expect-error a field is not a method
    Shop.builder().idGenerator("opened");
  });

  it("takes as ID generator no method returning anything but a string", () => {
    // @ts-expect-error a journey ID is a string
    Shop.builder().idGenerator("orderNumber");
  });

  it("takes as ID generator no method taking a parameter", () => {
    // @ts-expect-error no request can be made of an ID generator yet
    Shop.builder().idGenerator("withPrefix");
  });
});
