import type { StepHook, WorkflowHook } from "../policy.js";
import type { OnFailure, OnSuccess } from "../policy/lifecycle.js";
import { StepPolicy, type StepPolicyClass } from "../policy/step-policy.js";
import type { StepPolicyBuilder } from "../policy/step-policy/builder.js";
import { type FailureHookEnding, HookEnding } from "./hook-ending.js";

/**
 * How the hooks of a step policy mock end, each keeping the default unless
 * the script says otherwise, and whether it cannot be built.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface StepPolicyMockScript {
  /** How every call of `on step success` ends. */
  readonly onStepSuccess?: HookEnding | undefined;
  /** How every call of `on step failure` ends. */
  readonly onStepFailure?: FailureHookEnding | undefined;
  /** How every call of `on step retry` ends. */
  readonly onStepRetry?: FailureHookEnding | undefined;
  /** How every call of `on step abnormal termination` ends. */
  readonly onStepAbnormalTermination?: FailureHookEnding | undefined;
  /** The message of the error its constructor throws, when it cannot be built. */
  readonly buildFailure?: string | undefined;
}

/**
 * One call of a hook of a policy mock: which hook it was, and what its
 * requests were answered with, in the order they were given to the
 * policy's builder.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface HookCall {
  /** The hook called. */
  readonly hook: StepHook | WorkflowHook;
  /** What its requests were answered with, in order. */
  readonly received: readonly unknown[];
}

/**
 * A class extending {@link StepPolicyMock}, whose `builder(name)` starts a
 * step policy for a step's builder, as any step policy class's does.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface StepPolicyMockClass {
  /** Builds the policy mock for one attempt. */
  new (): StepPolicyMock;
  /** The prototype every policy mock of the class shares. */
  readonly prototype: StepPolicyMock;
  /** Starts putting a step policy of the class together for a step's builder. */
  builder<C extends StepPolicyClass>(
    this: C,
    name?: string,
  ): StepPolicyBuilder<C>;
}

/**
 * The base class of the step policy mocks {@link stepPolicyMock} makes: a
 * step policy with a method for each step hook, taking whatever its requests
 * are answered with, which keeps every call and ends it as its script says,
 * through the helpers of {@link StepPolicy}, as a real hook does. A builder
 * names the methods of the hooks the policy defines, with their requests. A
 * class extending it may override a hook to do more first, returning a
 * promise of what the hook it overrides returns.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export abstract class StepPolicyMock extends StepPolicy {
  readonly #script: StepPolicyMockScript;
  readonly #calls: HookCall[] = [];

  /** Builds the policy mock whose hooks end as `script` says. */
  protected constructor(script: StepPolicyMockScript) {
    super();
    this.#script = script;
  }

  /** Every call of its hooks, in the order they were made. */
  get calls(): readonly HookCall[] {
    return [...this.#calls];
  }

  /** `on step success`, which may finish the workflow. */
  onStepSuccess(...received: unknown[]): OnSuccess | Promise<OnSuccess> {
    this.#calls.push({ hook: "on step success", received });
    const ending = this.#script.onStepSuccess;
    return ending?.kind === "finish workflow"
      ? this.finishWorkflow()
      : this.#played(ending);
  }

  /** `on step failure`. */
  onStepFailure(...received: unknown[]): OnFailure | Promise<OnFailure> {
    this.#calls.push({ hook: "on step failure", received });
    return this.#played(this.#script.onStepFailure);
  }

  /** `on step retry`. */
  onStepRetry(...received: unknown[]): OnFailure | Promise<OnFailure> {
    this.#calls.push({ hook: "on step retry", received });
    return this.#played(this.#script.onStepRetry);
  }

  /** `on step abnormal termination`. */
  onStepAbnormalTermination(
    ...received: unknown[]
  ): OnFailure | Promise<OnFailure> {
    this.#calls.push({ hook: "on step abnormal termination", received });
    return this.#played(this.#script.onStepAbnormalTermination);
  }

  #played(ending: FailureHookEnding = HookEnding.keepDefault): OnFailure {
    switch (ending.kind) {
      case "keep default":
        return this.keepDefault();
      case "fail workflow":
        return this.failWorkflow(ending.reason);
      case "fail":
        throw new Error(ending.errorMessage);
    }
  }
}

/**
 * A new class of step policy mock whose hooks end as the script says, and
 * whose `builder(name)` starts a step policy for a step's builder, as any
 * step policy class's does. itinera builds it anew for every attempt, as it
 * builds any step policy.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export function stepPolicyMock(
  script: StepPolicyMockScript = {},
): StepPolicyMockClass {
  return class extends StepPolicyMock {
    constructor() {
      if (script.buildFailure !== undefined) {
        throw new Error(script.buildFailure);
      }
      super(script);
    }
  };
}
