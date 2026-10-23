import { named } from "../name.js";
import type {
  RolesOf,
  StepPolicyClass,
  WorkflowPolicyClass,
} from "../policy.js";
import {
  declarationOfPolicy,
  type PolicyDeclaration,
} from "../policy/declared.js";
import type { ReporterClass } from "../report.js";
import type { StepClass, StepOptions } from "../step.js";
import { isDeclared } from "../step/declared.js";
import { describeStep } from "../step/descriptor.js";
import type { Workflow, WorkflowName } from "../workflow.js";
import { assemble } from "./descriptor.js";
import { declarationOn } from "./registry.js";

/**
 * What `@workflow` says about a workflow.
 *
 * {@includeCode ../../examples/workflow.ts}
 *
 * @typeParam P The workflow policies attached to the workflow, as a list
 * written in place.
 */
export interface WorkflowOptions<
  P extends readonly WorkflowPolicyClass[] = readonly [],
> {
  /** The workflow's name, which every event of its journeys carries. */
  readonly name: string;
  /**
   * The classes of the workflow's own reporters, built for every journey
   * before the reporters an instance adds.
   */
  readonly reporters?: readonly ReporterClass[];
  /**
   * The workflow policies attached to the workflow, in the order their hooks
   * are looked up, each declared with `@workflowPolicy`. The workflow must
   * implement the roles each of them requests.
   */
  readonly policies?: P;
}

/**
 * A workflow class, given to a class decorator, whose objects implement the
 * roles `R`.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export type WorkflowClass<R = unknown> = abstract new (
  ...args: never[]
) => Workflow & R;

/**
 * Declares a workflow: a class extending {@link Workflow} directly, whose
 * steps the `@withStep` decorators written below this one list, in the
 * order they run. It goes on the top line, above every `@withStep`.
 *
 * It checks the whole declaration when the class is defined, and makes the
 * workflow's descriptor, which `build()` hands to every workflow object.
 * It compiles only on a class that implements every role its policies
 * request.
 *
 * {@includeCode ../../examples/workflow.ts}
 *
 * @throws Violations, when the class is defined, listing every violation in
 * how the workflow is put together.
 *
 * @throws Error, when the class is defined, if the name is empty, if the
 * class does not extend `Workflow` itself, if it is declared twice, or if a
 * policy is not declared with `@workflowPolicy`.
 */
export function workflow<
  const P extends readonly WorkflowPolicyClass[] = readonly [],
>(options: WorkflowOptions<P>): (target: WorkflowClass<RolesOf<P>>) => void {
  return (target) => {
    const policies = options.policies ?? [];
    requireDeclared(policies, "workflow");
    const declaration = declarationOn(target);
    if (declaration.descriptor !== undefined) {
      throw new Error(`${target.name} is declared with @workflow twice`);
    }
    declaration.name = named<WorkflowName>(
      options.name,
      `workflow class ${target.name}`,
    );
    declaration.reporters = options.reporters ?? [];
    declaration.policies = policies;
    declaration.descriptor = assemble(declaration, target.name);
  };
}

/**
 * Adds a step to a workflow, after the steps listed on the lines below it:
 * the class of the step, declared with `@step`, and what the workflow says
 * about it, its name first. It compiles only on a class that implements
 * every role the step's policies request.
 *
 * {@includeCode ../../examples/workflow.ts}
 *
 * @throws Error, when the class is defined, if the step is not declared with
 * `@step`, if a policy is not declared with `@stepPolicy`, if its name is
 * empty, if its retry budget is not a whole number from 0, or if it is
 * written above `@workflow`.
 */
export function withStep<
  const P extends readonly StepPolicyClass[] = readonly [],
>(
  step: StepClass,
  options: StepOptions<P>,
): (target: WorkflowClass<RolesOf<P>>) => void {
  return (target) => {
    if (!isDeclared(step)) {
      throw new Error(`${step.name} is not declared with @step`);
    }
    requireDeclared(options.policies ?? [], "step");
    const declaration = declarationOn(target);
    if (declaration.descriptor !== undefined) {
      throw new Error(
        `@withStep(${step.name}) is written above @workflow on ${target.name}: write @workflow on the top line`,
      );
    }
    declaration.steps.unshift(describeStep(step, options));
  };
}

function requireDeclared(
  policies: readonly { readonly name: string }[],
  kind: PolicyDeclaration["kind"],
): void {
  const undeclared = policies.find((policy) => isUndeclared(policy, kind));
  if (undeclared !== undefined) {
    throw new Error(`${undeclared.name} is not declared with @${kind}Policy`);
  }
}

function isUndeclared(
  policy: object,
  kind: PolicyDeclaration["kind"],
): boolean {
  return declarationOfPolicy(policy)?.kind !== kind;
}
