import type { Reason } from "../step.js";
import type { FailWorkflow, FinishWorkflow, KeepDefault } from "./lifecycle.js";

declare const roles: unique symbol;

const keptDefault: KeepDefault = Object.freeze({ kind: "KeepDefault" });
const finished: FinishWorkflow = Object.freeze({ kind: "FinishWorkflow" });

/**
 * The base class of every step policy: hooks called around the attempts of
 * the steps it is attached to, each a method marked with the decorator of
 * the hook it implements, such as `@onStepSuccess()`. itinera builds a new
 * instance for every attempt, with a constructor that takes nothing.
 *
 * A hook fails by throwing, which aborts the journey. Only a class extending
 * `StepPolicy` is a step policy, whether it is declared with `@stepPolicy` or
 * given to a workflow's builder.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @typeParam R The roles its hooks request, which every workflow it is
 * attached to must provide: an interface, or several joined with `&`.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- R exists only in the types, where a workflow the policy is attached to must provide it
export abstract class StepPolicy<R = unknown> {
  // eslint-disable-next-line no-unused-private-class-members -- only a class extending StepPolicy has this field, so only such a class has the type of a step policy
  readonly #stepPolicy = true;

  /**
   * The roles the policy requests. It exists only in the types, where a
   * workflow it is attached to must provide them.
   */
  declare readonly [roles]: R;

  /** What a hook returns to keep the default. */
  protected keepDefault(): KeepDefault {
    return keptDefault;
  }

  /** What `on step success` returns to make the journey succeed at once. */
  protected finishWorkflow(): FinishWorkflow {
    return finished;
  }

  /**
   * What a step hook returns to make the journey fail at once, with a
   * reason, or only its code.
   */
  protected failWorkflow(reason: Reason | string): FailWorkflow {
    return Object.freeze({
      kind: "FailWorkflow",
      reason: typeof reason === "string" ? { code: reason } : reason,
    });
  }
}

/**
 * A class extending {@link StepPolicy}, which itinera builds for each attempt
 * with a constructor that takes nothing.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @typeParam R The roles it requests.
 */
export interface StepPolicyClass<R = unknown> {
  /** Builds the policy for one attempt. */
  new (): StepPolicy<R>;
  /** The prototype every instance shares. */
  readonly prototype: StepPolicy<R>;
}
