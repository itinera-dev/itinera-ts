import {
  type WorkflowPolicyBuilder,
  workflowPolicyBuilder,
} from "./workflow-policy/builder.js";
import {
  refuseStaticData,
  type WithoutStaticData,
} from "../declaration/static-data.js";
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
   * A workflow policy keeps no static data, which every journey would share,
   * refused as {@link WithoutStaticData} says: at compile time, or else when
   * the builder starts.
   *
   * @throws Error if the class keeps static data, if the name is empty, or
   * if the class is declared with a policy's decorator.
   */
  static builder<C extends WorkflowPolicyClass>(
    this: WithoutStaticData<C, typeof WorkflowPolicy>,
    name?: string,
  ): WorkflowPolicyBuilder<C> {
    refuseStaticData(this, WorkflowPolicy, "workflow policy");
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
