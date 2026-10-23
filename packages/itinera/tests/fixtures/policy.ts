import type { RetryCause, StepFailureCause } from "../../src/policy.js";
import type { Contributor } from "../../src/journey.js";
import { onStepSuccess, onWorkflowSuccess } from "../../src/policy/hooks.js";
import { stepPolicy, workflowPolicy } from "../../src/policy/declared.js";
import type { OnFailure, OnSuccess } from "../../src/policy/lifecycle.js";
import { role } from "../../src/policy/request.js";
import { StepPolicy } from "../../src/policy/step-policy.js";
import { WorkflowPolicy } from "../../src/policy/workflow-policy.js";

/** A role a workflow provides: telling a customer something. */
export interface Messages {
  tell(message: string): void;
}

/** A step policy that keeps the default after every success. */
@stepPolicy({ name: "audit" })
export class Audit extends StepPolicy {
  @onStepSuccess()
  audited(): OnSuccess {
    return this.keepDefault();
  }
}

/** Another step policy that keeps the default after every success. */
@stepPolicy({ name: "ledger" })
export class Ledger extends StepPolicy {
  @onStepSuccess()
  recorded(): OnSuccess {
    return this.keepDefault();
  }
}

/** A workflow policy that requests the role {@link Messages}. */
@workflowPolicy({ name: "notify" })
export class Notify extends WorkflowPolicy<Messages> {
  @onWorkflowSuccess()
  paid(@role<Messages>() messages: Messages): void {
    messages.tell("paid");
  }
}

/** A workflow policy that requests no role. */
@workflowPolicy({ name: "quiet" })
export class Quiet extends WorkflowPolicy {
  @onWorkflowSuccess()
  paid(): void {}
}

/**
 * A step policy declared without decorators, for a policy's builder: each
 * of its methods may implement a hook, and it has a field that is not one.
 */
export class Tally extends StepPolicy {
  readonly field = "not a method";

  counted(note: string, contributing: Contributor): OnSuccess {
    contributing.contribute("note", note);
    return this.keepDefault();
  }

  failed(cause: StepFailureCause): OnFailure {
    return this.failWorkflow(cause);
  }

  retried(cause: RetryCause): OnFailure {
    return this.failWorkflow(cause);
  }
}

/** A workflow policy declared without decorators, for a policy's builder. */
export class Close extends WorkflowPolicy {
  closed(): void {}

  failed(): void {}
}
