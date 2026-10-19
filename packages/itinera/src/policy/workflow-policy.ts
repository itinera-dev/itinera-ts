import {
  type WorkflowPolicyBuilder,
  workflowPolicyBuilder,
} from "./workflow-policy/builder.js";
declare const roles: unique symbol;

/**
 * The base class of every workflow policy: hooks called once a journey's
 * outcome is known, each a method marked with the decorator of the hook it
 * implements, such as `@onWorkflowSuccess()`. itinera builds one instance
 * per journey, with a constructor that takes nothing.
 *
 * A hook returns nothing, and fails by throwing, which aborts the journey.
 * Only a class extending `WorkflowPolicy` is a workflow policy, whether it is
 * declared with `@workflowPolicy` or given to a workflow's builder.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @typeParam R The roles its hooks request, which every workflow it is
 * attached to must provide: an interface, or several joined with `&`.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- R exists only in the types, where a workflow the policy is attached to must provide it
export abstract class WorkflowPolicy<R = unknown> {
  // eslint-disable-next-line no-unused-private-class-members -- only a class extending WorkflowPolicy has this field, so only such a class has the type of a workflow policy
  readonly #workflowPolicy = true;

  /**
   * The roles the policy requests. It exists only in the types, where a
   * workflow it is attached to must provide them.
   */
  declare readonly [roles]: R;

  /**
   * Starts putting a workflow policy of this class together, for a class
   * declared without decorators, named `name`, or else after the class, as
   * `Notify.builder("notify")`.
   *
   * {@includeCode ../../examples/policy-builder.ts}
   *
   * @throws Error if the name is empty, or if the class is declared with a
   * policy's decorator.
   */
  static builder<C extends WorkflowPolicyClass>(
    this: C,
    name?: string,
  ): WorkflowPolicyBuilder<C> {
    return workflowPolicyBuilder(this, name);
  }
}

/**
 * A class extending {@link WorkflowPolicy}, which itinera builds for each
 * journey with a constructor that takes nothing.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @typeParam R The roles it requests.
 */
export interface WorkflowPolicyClass<R = unknown> {
  /** Builds the policy for one journey. */
  new (): WorkflowPolicy<R>;
  /** The prototype every instance shares. */
  readonly prototype: WorkflowPolicy<R>;
}
