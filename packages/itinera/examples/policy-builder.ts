import assert from "node:assert/strict";
import {
  type Contributor,
  contributor,
  failureCause,
  fromStep,
  type OnFailure,
  type OnSuccess,
  type PolicyDescriptor,
  role,
  Step,
  type StepFailureCause,
  StepPolicy,
  type StepPolicyBuilder,
  type Outcome,
  Workflow,
  WorkflowPolicy,
  type WorkflowPolicyBuilder,
} from "itinera/unstable";
import { integer } from "itinera/value";

/** A role the shop provides: telling a customer something. */
interface Messages {
  tell(message: string): void;
}

class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

class Audit extends StepPolicy {
  audited(charged: number, contributing: Contributor): OnSuccess {
    contributing.contribute("audit", `charged ${String(charged)}`);
    return this.keepDefault();
  }

  failed(cause: StepFailureCause): OnFailure {
    return this.failWorkflow(cause);
  }
}

class Notify extends WorkflowPolicy<Messages> {
  paid(messages: Messages): void {
    messages.tell("paid");
  }
}

class Orders extends Workflow implements Messages {
  readonly told: string[] = [];

  tell(message: string): void {
    this.told.push(message);
  }
}

const audit: StepPolicyBuilder<typeof Audit> = Audit.builder("audit")
  .onStepSuccess("audited", fromStep("charged", integer), contributor())
  .onStepFailure("failed", failureCause());
const notify: WorkflowPolicyBuilder<typeof Notify> = Notify.builder(
  "notify",
).onWorkflowSuccess("paid", role<Messages>());

const orders = Orders.builder()
  .name("orders")
  .step(Charge.builder("charge").policy(audit))
  .policy(notify)
  .build();

const descriptor = orders.instance().descriptor;
const attached: readonly PolicyDescriptor[] =
  descriptor.steps()[0]?.policies() ?? [];

assert.deepEqual(
  attached.map((policy) => policy.name),
  ["audit"],
);
assert.deepEqual(attached[0]?.hooks(), ["on step success", "on step failure"]);
assert.ok(attached[0].build() instanceof Audit);
assert.deepEqual(
  descriptor.policies().map((policy) => policy.name),
  ["notify"],
);

class Counter extends Workflow {}

// @ts-expect-error Counter does not implement Messages, which notify requests
Counter.builder().policy(notify);
