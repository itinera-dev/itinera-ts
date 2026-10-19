import { describe, it } from "vitest";
import type { Option } from "../option.js";
import type { RetryCause, StepFailureCause } from "../policy.js";
import { type Outcome, Step } from "../step.js";
import { integer, optional } from "../value/token.js";
import type { Messages } from "./fixtures.js";
import { failureCause, fromStep, retryCause, role } from "./request.js";
import { StepPolicy } from "./step-policy.js";
import { WorkflowPolicy } from "./workflow-policy.js";

interface Payments {
  refund(amount: number): void;
}

describe("fromStep", () => {
  it("compiles in a step policy on a parameter of the type it gives", () => {
    class Audit extends StepPolicy {
      audited(
        @fromStep("charged", integer) charged: number,
        @fromStep("coupon", optional(integer)) coupon: Option<number>,
      ): number {
        return coupon.unwrapOr(charged);
      }
    }
    return Audit;
  });

  it("does not compile on a parameter of another type, or in a workflow policy", () => {
    class Audit extends StepPolicy {
      audited(
        // @ts-expect-error an integer is not a string
        @fromStep("charged", integer) charged: string,
      ): string {
        return charged;
      }
    }
    class Notify extends WorkflowPolicy {
      paid(
        // @ts-expect-error a workflow policy acts on no step
        @fromStep("charged", integer) charged: number,
      ): number {
        return charged;
      }
    }
    return [Audit, Notify];
  });
});

describe("role", () => {
  it("compiles in a policy that names the role among its roles", () => {
    class Notify extends WorkflowPolicy<Messages & Payments> {
      paid(
        @role<Messages>() messages: Messages,
        @role<Payments>() payments: Payments,
      ): void {
        messages.tell("paid");
        payments.refund(0);
      }
    }
    return Notify;
  });

  it("does not compile in a policy that does not name the role", () => {
    class Notify extends WorkflowPolicy<Messages> {
      paid(
        // @ts-expect-error the policy names only Messages
        @role<Payments>() payments: Payments,
      ): void {
        payments.refund(0);
      }
    }
    class Audit extends StepPolicy {
      audited(
        // @ts-expect-error the policy names no role
        @role<Messages>() messages: Messages,
      ): void {
        messages.tell("audited");
      }
    }
    return [Notify, Audit];
  });

  it("does not compile in a step", () => {
    class Charge extends Step {
      override run(
        // @ts-expect-error steps request services, never roles
        @role<Messages>() messages: Messages,
      ): Outcome {
        messages.tell("charged");
        return this.succeed();
      }
    }
    return Charge;
  });
});

describe("failureCause and retryCause", () => {
  it("compile in a step policy on parameters of their causes", () => {
    class Audit extends StepPolicy {
      failed(@failureCause() cause: StepFailureCause): StepFailureCause {
        return cause;
      }

      retried(@retryCause() cause: RetryCause): RetryCause {
        return cause;
      }
    }
    return Audit;
  });

  it("do not compile on the other's cause, or in a workflow policy", () => {
    class Audit extends StepPolicy {
      retried(
        // @ts-expect-error retries exhausted is never why a step is retried
        @failureCause() cause: RetryCause,
      ): RetryCause {
        return cause;
      }
    }
    class Notify extends WorkflowPolicy {
      paid(
        // @ts-expect-error a workflow policy acts on no step
        @retryCause() cause: RetryCause,
      ): RetryCause {
        return cause;
      }
    }
    return [Audit, Notify];
  });
});
