import { describe, it } from "vitest";
import { Audit, type Messages, Notify, Quiet } from "../../fixtures/policy.js";
import { onStepSuccess } from "../../../src/policy/hooks.js";
import type { OnSuccess } from "../../../src/policy/lifecycle.js";
import { role } from "../../../src/policy/request.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import type { StepPolicyClass } from "../../../src/policy.js";
import { Charge } from "../../fixtures/step.js";
import { Workflow } from "../../../src/workflow.js";
import { withStep, workflow } from "../../../src/workflow/decorators.js";

interface Payments {
  refund(amount: number): void;
}

class Refund extends StepPolicy<Payments> {
  @onStepSuccess()
  refunded(@role<Payments>() payments: Payments): OnSuccess {
    payments.refund(1);
    return this.keepDefault();
  }
}

declare const flag: boolean;

describe("the roles of the policies a workflow attaches", () => {
  it("compile on a workflow that implements them all", () => {
    @workflow({ name: "orders", policies: [Notify] })
    @withStep(Charge, { name: "charge", policies: [Audit, Refund] })
    class Orders extends Workflow implements Messages, Payments {
      tell(message: string): string {
        return message;
      }

      refund(amount: number): number {
        return amount;
      }
    }
    return Orders;
  });

  it("do not compile on a workflow that does not implement one", () => {
    // @ts-expect-error notify requests Messages, which Orders does not implement
    @workflow({ name: "orders", policies: [Notify] })
    class Orders extends Workflow {}
    // @ts-expect-error refund requests Payments, which the workflow does not implement
    @withStep(Charge, { name: "charge", policies: [Audit, Refund] })
    class Corner extends Workflow {}
    return [Orders, Corner];
  });

  it("do not compile when the list may be one that requests a role", () => {
    // @ts-expect-error notify requests Messages, if the list holds it
    @workflow({ name: "orders", policies: flag ? [Notify] : [] })
    class Orders extends Workflow {}
    // @ts-expect-error notify requests Messages, if the list holds it
    @workflow({ name: "orders", policies: [flag ? Notify : Quiet] })
    class Corner extends Workflow {}
    return [Orders, Corner];
  });

  it("do not compile with a list not written in place", () => {
    const policies: readonly StepPolicyClass[] = [Audit];
    // @ts-expect-error the roles of a list whose length is not known cannot be checked
    @withStep(Charge, { name: "charge", policies })
    class Orders extends Workflow {}
    return Orders;
  });

  it("do not compile with a policy of the other kind", () => {
    // @ts-expect-error a workflow lists workflow policies, not step policies
    @workflow({ name: "orders", policies: [Audit] })
    // @ts-expect-error a step lists step policies, not workflow policies
    @withStep(Charge, { name: "charge", policies: [Quiet] })
    class Orders extends Workflow {}
    return Orders;
  });
});
