import { methodsWithRequests, where } from "../declaration.js";
import { named } from "../name.js";
import type {
  RolesOf,
  StepPolicyClass,
  WorkflowPolicyClass,
} from "../policy.js";
import { declaredPolicy } from "../policy/declared.js";
import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { ReporterClass } from "../report.js";
import type { StepClass, StepOptions } from "../step.js";
import { isDeclared } from "../step/declared.js";
import { describeStep } from "../step/descriptor.js";
import { rescueGiven } from "../step/rescue/builder.js";
import type { Workflow, WorkflowName } from "../workflow.js";
import { assemble } from "./descriptor/assemble.js";
import { type Declaration, declarationOn } from "./registry.js";

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
 * class does not extend `Workflow` itself, if it is declared twice, if a
 * policy is not declared with `@workflowPolicy`, or if a method carries
 * requests but is marked with none of `@inputAdapter`, `@provider` and
 * `@idGenerator`.
 */
export function workflow<
  const P extends readonly WorkflowPolicyClass[] = readonly [],
>(options: WorkflowOptions<P>): (target: WorkflowClass<RolesOf<P>>) => void {
  return (target) => {
    const policies = (options.policies ?? []).map(asWorkflowPolicy);
    const declaration = declarationOn(target);
    if (declaration.descriptor !== undefined) {
      throw new Error(`${target.name} is declared with @workflow twice`);
    }
    declaration.name = named<WorkflowName>(
      options.name,
      `workflow class ${target.name}`,
    );
    const unmarked = methodsWithRequests(target).find((key) =>
      isUnmarked(key, declaration),
    );
    if (unmarked !== undefined) {
      throw new Error(
        `${where(target, unmarked)} carries requests, but is marked with none of @inputAdapter, @provider and @idGenerator`,
      );
    }
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
 * `@step`, if a policy is not declared with `@stepPolicy`, if its rescue step
 * is not declared with `@rescueStep`, if its name is empty, if its retry
 * budget is not a whole number from 0, or if it is written above
 * `@workflow`.
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
    const policies = (options.policies ?? []).map(asStepPolicy);
    const rescue =
      options.rescue === undefined ? undefined : rescueGiven(options.rescue);
    const declaration = declarationOn(target);
    if (declaration.descriptor !== undefined) {
      throw new Error(
        `@withStep(${step.name}) is written above @workflow on ${target.name}: write @workflow on the top line`,
      );
    }
    declaration.steps.unshift(
      describeStep(step, { ...options, policies, rescue }),
    );
  };
}

function asStepPolicy(policy: StepPolicyClass): PolicyDescriptor {
  return declaredPolicy(policy, "step");
}

function asWorkflowPolicy(policy: WorkflowPolicyClass): PolicyDescriptor {
  return declaredPolicy(policy, "workflow");
}

function isUnmarked(key: string | symbol, declaration: Declaration): boolean {
  return !markedOf(declaration).includes(key);
}

function markedOf(declaration: Declaration): readonly (string | symbol)[] {
  const { adapters, providers, idGenerator } = declaration;
  return [...adapters, ...providers, ...(idGenerator ? [idGenerator] : [])].map(
    (marked) => marked.key,
  );
}
