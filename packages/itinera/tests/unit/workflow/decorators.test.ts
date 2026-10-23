import { describe, expect, it } from "vitest";
import { type Outcome, Step } from "../../../src/step.js";
import { onStepSuccess, onWorkflowSuccess } from "../../../src/policy/hooks.js";
import {
  Audit,
  Ledger,
  type Messages,
  Notify,
  Quiet,
} from "../../fixtures/policy.js";
import type { OnSuccess } from "../../../src/policy/lifecycle.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";
import { rescueOf } from "../../../src/step/descriptor.js";
import type { PolicyDescriptor } from "../../../src/policy/descriptor.js";
import { Charge, Refund, Ship } from "../../fixtures/step.js";
import { RescueStep, type RescueOutcome } from "../../../src/step/rescue.js";
import type { JourneyId } from "../../../src/journey.js";
import { journeyId } from "../../../src/journey/request.js";
import { type Provided, provider } from "../../../src/service/provider.js";
import { serviceType } from "../../../src/service/request.js";
import { Workflow } from "../../../src/workflow.js";
import { inputAdapter, type Supplied } from "../../../src/workflow/adapter.js";
import { withStep, workflow } from "../../../src/workflow/decorators.js";
import { declarationOf } from "../../../src/workflow/registry.js";
import { Violations } from "../../../src/workflow/violation.js";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

describe("workflow", () => {
  it("lists the steps in the order their decorators are written", () => {
    @workflow({ name: "orders" })
    @withStep(Charge, { name: "charge" })
    @withStep(Ship, { name: "ship" })
    class Orders extends Workflow {}

    const steps = declarationOf(Orders).descriptor?.steps() ?? [];
    expect(steps.map((described) => described.name)).toEqual([
      "charge",
      "ship",
    ]);
  });

  it("refuses an empty name", () => {
    expect(() => {
      @workflow({ name: "" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("workflow class Orders has an empty name");
  });

  it("refuses a class that extends another workflow", () => {
    class Shop extends Workflow {}
    expect(() => {
      @workflow({ name: "orders" })
      class Orders extends Shop {}
      return Orders;
    }).toThrow("Orders must extend Workflow itself");
  });

  it("refuses a class declared twice", () => {
    expect(() => {
      @workflow({ name: "orders" })
      @workflow({ name: "orders" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Orders is declared with @workflow twice");
  });

  it("refuses two steps with one name, naming it once", () => {
    function declaring(): typeof Workflow {
      @workflow({ name: "orders" })
      @withStep(Ship, { name: "ship" })
      @withStep(Charge, { name: "ship" })
      @withStep(Ship, { name: "ship" })
      class Orders extends Workflow {}
      return Orders;
    }
    expect(declaring).toThrow(Violations);
    expect(declaring).toThrow(/^duplicate step name: ship$/);
  });
});

describe("workflow, on the methods of its class", () => {
  it("refuses a method that carries requests but is marked with neither @inputAdapter nor @provider", () => {
    expect(() => {
      @workflow({ name: "orders" })
      class Orders extends Workflow {
        tell(@journeyId() id: JourneyId): JourneyId {
          return id;
        }
      }
      return Orders;
    }).toThrow(
      "Orders.tell carries requests, but is marked with neither @inputAdapter nor @provider",
    );
  });

  it("accepts the methods its adapters and providers mark", () => {
    @workflow({ name: "orders" })
    class Orders extends Workflow {
      @inputAdapter({ steps: ["charge"] })
      price(@journeyId() id: JourneyId): Supplied {
        return this.supply(id);
      }

      @provider(PAYMENT_GATEWAY)
      payments(@journeyId() id: JourneyId): Provided<PaymentGateway> {
        return this.provide({ take: () => id });
      }
    }
    const declaration = declarationOf(Orders);
    expect([declaration.adapters, declaration.providers]).toEqual([
      [expect.objectContaining({ key: "price" })],
      [expect.objectContaining({ key: "payments" })],
    ]);
  });
});

describe("withStep", () => {
  it("refuses a step class not declared with @step", () => {
    class Pack extends Step {
      override run(): Outcome {
        return this.succeed();
      }
    }
    expect(() => {
      @workflow({ name: "orders" })
      @withStep(Pack, { name: "pack" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Pack is not declared with @step");
  });

  it("attaches the rescue step it names", () => {
    @workflow({ name: "orders" })
    @withStep(Charge, { name: "charge", rescue: Refund })
    class Orders extends Workflow {}
    expect(declarationOf(Orders).steps.map(rescueOf)).toMatchObject([
      { name: "charge_rescue", step: Refund },
    ]);
  });

  it("refuses a rescue step not declared with @rescueStep", () => {
    class Retry extends RescueStep {
      override run(): RescueOutcome {
        return this.succeed();
      }
    }
    expect(() => {
      @workflow({ name: "orders" })
      @withStep(Charge, { name: "charge", rescue: Retry })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Retry is not declared with @rescueStep");
  });

  it("refuses to be written above @workflow", () => {
    expect(() => {
      @withStep(Ship, { name: "ship" })
      @workflow({ name: "orders" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow(
      "@withStep(Ship) is written above @workflow on Orders: write @workflow on the top line",
    );
  });
});

describe("the policies of a workflow", () => {
  it("are attached to the workflow and to its steps, in order", () => {
    @workflow({ name: "orders", policies: [Notify, Quiet] })
    @withStep(Charge, { name: "charge", policies: [Ledger, Audit] })
    class Orders extends Workflow implements Messages {
      tell(message: string): string {
        return message;
      }
    }
    const declaration = declarationOf(Orders);
    expect(declaration.policies.map(nameOf)).toEqual(["notify", "quiet"]);
    expect(declaration.steps[0]?.policies().map(nameOf)).toEqual([
      "ledger",
      "audit",
    ]);
  });

  it("refuse a step policy not declared with @stepPolicy", () => {
    class Unchecked extends StepPolicy {
      @onStepSuccess()
      checked(): OnSuccess {
        return this.keepDefault();
      }
    }
    expect(() => {
      @workflow({ name: "orders" })
      @withStep(Charge, { name: "charge", policies: [Unchecked] })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Unchecked is not declared with @stepPolicy");
  });

  it("refuse a workflow policy not declared with @workflowPolicy", () => {
    class Unsent extends WorkflowPolicy {
      @onWorkflowSuccess()
      sent(): void {}
    }
    expect(() => {
      @workflow({ name: "orders", policies: [Unsent] })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Unsent is not declared with @workflowPolicy");
  });

  it("refuse a workflow policy given as a step policy", () => {
    expect(() => {
      @workflow({ name: "orders" })
      @withStep(Charge, {
        name: "charge",
        policies: [Quiet as unknown as typeof Audit],
      })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Quiet is not declared with @stepPolicy");
  });

  it("refuse a step policy given as a workflow policy", () => {
    expect(() => {
      @workflow({
        name: "orders",
        policies: [Audit as unknown as typeof Quiet],
      })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Audit is not declared with @workflowPolicy");
  });
});

function nameOf(described: PolicyDescriptor): string {
  return described.name;
}
