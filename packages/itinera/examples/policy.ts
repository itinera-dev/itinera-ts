import assert from "node:assert/strict";
import {
  type Contributor,
  contributor,
  type JourneyId,
  journeyId,
} from "itinera/journey";
import { None, type Option, Some } from "itinera/option";
import {
  failureCause,
  fromStep,
  type HookDecorator,
  type KeepDefault,
  type OnFailure,
  onStepFailure,
  onStepRetry,
  onStepSuccess,
  type OnSuccess,
  onWorkflowSuccess,
  type PolicyOptions,
  RetryCause,
  retryCause,
  role,
  type RolesOf,
  type RolesOfOne,
  type StepFailureCause,
  StepPolicy,
  stepPolicy,
  type StepPolicyClass,
  WorkflowPolicy,
  workflowPolicy,
  type WorkflowPolicyClass,
} from "itinera/policy";
import {
  attempt,
  Attempt,
  failureReason,
  type FromFailure,
  type FromFailureOptions,
  type Outcome,
  type Reason,
  Step,
  step,
  type StepName,
  stepName,
} from "itinera/step";
import {
  fromWorkflow,
  withStep,
  Workflow,
  workflow,
  type WorkflowClass,
} from "itinera/workflow";
import { integer, optional } from "itinera/value";

/** A role the shop provides: telling a customer something. */
interface Messages {
  tell(message: string): void;
}

@step()
class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

@stepPolicy({ name: "audit" })
class Audit extends StepPolicy {
  @onStepSuccess()
  audited(
    @fromStep("charged", integer) charged: number,
    @contributor() contributor: Contributor,
  ): OnSuccess {
    contributor.contribute("audit", `charged ${String(charged)}`);
    return charged > 1000 ? this.failWorkflow("too much") : this.keepDefault();
  }

  @onStepRetry()
  retried(
    @stepName() step: StepName,
    @attempt() attempt: Attempt,
    @retryCause() cause: RetryCause,
  ): OnFailure {
    return attempt.number > 2 && cause === RetryCause.AbnormalTermination
      ? this.failWorkflow({
          code: "unstable",
          message: `${step} keeps failing`,
        })
      : this.keepDefault();
  }

  @onStepFailure()
  failed(
    @failureCause() cause: StepFailureCause,
    @failureReason({ optional: true }) reason: Option<Reason>,
  ): OnFailure {
    return reason.isSome() && reason.value.code === "fraud"
      ? this.failWorkflow(reason.value)
      : this.failWorkflow(cause);
  }
}

@workflowPolicy({ name: "notify" })
class Notify extends WorkflowPolicy<Messages> {
  @onWorkflowSuccess()
  paid(
    @journeyId() id: JourneyId,
    @fromWorkflow("payment", optional(integer)) payment: Option<number>,
    @role<Messages>() messages: Messages,
  ): void {
    messages.tell(`order ${id}: paid ${String(payment.unwrapOr(0))}`);
  }
}

@workflow({ name: "orders", policies: [Notify] })
@withStep(Charge, { name: "charge", retryBudget: 2, policies: [Audit] })
class Orders extends Workflow implements Messages {
  readonly told: string[] = [];

  tell(message: string): void {
    this.told.push(message);
  }
}

const contributed = new Map<string, unknown>();
const recording: Contributor = {
  contribute: (key, value) => {
    contributed.set(key, value);
  },
};
const audit = new Audit();
const kept: KeepDefault = { kind: "KeepDefault" };
const notQuite: FromFailure<Reason, false> = { code: "late" };
const asOptional: FromFailureOptions<true> = { optional: true };
const named: PolicyOptions = { name: "audit" };
const policies: readonly StepPolicyClass[] = [Audit];
const workflowPolicies: readonly WorkflowPolicyClass<Messages>[] = [Notify];
const shop = Orders.build();
const messages: RolesOfOne<typeof Notify> = shop;
const roles: RolesOf<[typeof Audit, typeof Notify]> = messages;
const orders: WorkflowClass<Messages> = Orders;
const onSuccess: HookDecorator<OnSuccess, StepPolicy> = onStepSuccess();

assert.deepEqual(audit.audited(40, recording), kept);
assert.deepEqual([...contributed], [["audit", "charged 40"]]);
assert.deepEqual(audit.audited(2000, recording), {
  kind: "FailWorkflow",
  reason: { code: "too much" },
});
assert.deepEqual(audit.failed("retries exhausted", None), {
  kind: "FailWorkflow",
  reason: { code: "retries exhausted" },
});
new Notify().paid("R-1" as JourneyId, Some(40), roles);
assert.deepEqual(shop.told, ["order R-1: paid 40"]);
assert.equal(notQuite.code, "late");
assert.ok(asOptional.optional);
assert.equal(named.name, "audit");
assert.deepEqual(policies, [Audit]);
assert.deepEqual(workflowPolicies, [Notify]);
assert.equal(orders, Orders);
assert.equal(typeof onSuccess, "function");
