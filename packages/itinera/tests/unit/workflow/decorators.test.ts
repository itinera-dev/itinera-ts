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
import { policiesOf } from "../../../src/step/descriptor.js";
import { Charge, Ship } from "../../fixtures/step.js";
import { Workflow } from "../../../src/workflow.js";
import { withStep, workflow } from "../../../src/workflow/decorators.js";
import { declarationOf } from "../../../src/workflow/registry.js";
import { Violations } from "../../../src/workflow/violation.js";

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
    expect(declaration.policies).toEqual([Notify, Quiet]);
    expect(declaration.steps.map(policiesOf)).toEqual([[Ledger, Audit]]);
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
