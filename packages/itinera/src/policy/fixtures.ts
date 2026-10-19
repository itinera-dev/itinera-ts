import { onStepSuccess, onWorkflowSuccess } from "./hooks.js";
import { stepPolicy, workflowPolicy } from "./declared.js";
import type { OnSuccess } from "./lifecycle.js";
import { role } from "./request.js";
import { StepPolicy } from "./step-policy.js";
import { WorkflowPolicy } from "./workflow-policy.js";

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
