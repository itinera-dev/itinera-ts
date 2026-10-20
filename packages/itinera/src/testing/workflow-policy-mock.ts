import {
  WorkflowPolicy,
  type WorkflowPolicyClass,
} from "../policy/workflow-policy.js";
import type { WorkflowPolicyBuilder } from "../policy/workflow-policy/builder.js";
import type { WorkflowHookEnding } from "./hook-ending.js";
import type { HookCall } from "./step-policy-mock.js";

/**
 * How the hooks of a workflow policy mock end, each returning nothing unless
 * the script says it fails, and whether it cannot be built.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface WorkflowPolicyMockScript {
  /** How every call of `on workflow success` ends. */
  readonly onWorkflowSuccess?: WorkflowHookEnding | undefined;
  /** How every call of `on workflow failure` ends. */
  readonly onWorkflowFailure?: WorkflowHookEnding | undefined;
  /** The message of the error its constructor throws, when it cannot be built. */
  readonly buildFailure?: string | undefined;
}

/**
 * A class extending {@link WorkflowPolicyMock}, whose `builder(name)` starts
 * a workflow policy for a workflow's builder, as any workflow policy class's
 * does.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface WorkflowPolicyMockClass {
  /** Builds the policy mock for one journey. */
  new (): WorkflowPolicyMock;
  /** The prototype every policy mock of the class shares. */
  readonly prototype: WorkflowPolicyMock;
  /** Starts putting a workflow policy of the class together for a workflow's builder. */
  builder<C extends WorkflowPolicyClass>(
    this: C,
    name?: string,
  ): WorkflowPolicyBuilder<C>;
}

/**
 * The base class of the workflow policy mocks {@link workflowPolicyMock}
 * makes: a workflow policy with a method for each workflow hook, taking
 * whatever its requests are answered with, which keeps every call and ends
 * it as its script says. A builder names the methods of the hooks the
 * policy defines, with their requests. A class extending it may override a
 * hook to do more first, returning a promise.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export abstract class WorkflowPolicyMock extends WorkflowPolicy {
  readonly #script: WorkflowPolicyMockScript;
  readonly #calls: HookCall[] = [];

  /** Builds the policy mock whose hooks end as `script` says. */
  protected constructor(script: WorkflowPolicyMockScript) {
    super();
    this.#script = script;
  }

  /** Every call of its hooks, in the order they were made. */
  get calls(): readonly HookCall[] {
    return [...this.#calls];
  }

  /** `on workflow success`. */
  onWorkflowSuccess(...received: unknown[]): void | Promise<void> {
    this.#calls.push({ hook: "on workflow success", received });
    played(this.#script.onWorkflowSuccess);
  }

  /** `on workflow failure`. */
  onWorkflowFailure(...received: unknown[]): void | Promise<void> {
    this.#calls.push({ hook: "on workflow failure", received });
    played(this.#script.onWorkflowFailure);
  }
}

/**
 * A new class of workflow policy mock whose hooks end as the script says,
 * and whose `builder(name)` starts a workflow policy for a workflow's
 * builder, as any workflow policy class's does. itinera builds it once for
 * every journey, as it builds any workflow policy.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export function workflowPolicyMock(
  script: WorkflowPolicyMockScript = {},
): WorkflowPolicyMockClass {
  return class extends WorkflowPolicyMock {
    constructor() {
      if (script.buildFailure !== undefined) {
        throw new Error(script.buildFailure);
      }
      super(script);
    }
  };
}

function played(ending: WorkflowHookEnding | undefined): void {
  if (ending?.kind === "fail") {
    throw new Error(ending.errorMessage);
  }
}
