import { refuseMethodParameters, requireMetadata } from "../declaration.js";
import { named } from "../name.js";
import type { ReporterClass } from "../report.js";
import type { StepClass, StepOptions } from "../step.js";
import { isDeclared } from "../step/declared.js";
import { describeStep } from "../step/descriptor.js";
import { Workflow, type WorkflowName } from "../workflow.js";
import { assemble } from "./descriptor.js";
import { type Declaration, declarationOf } from "./registry.js";

/**
 * What `@workflow` says about a workflow.
 *
 * {@includeCode ../../examples/workflow.ts}
 */
export interface WorkflowOptions {
  /** The workflow's name, which every event of its journeys carries. */
  readonly name: string;
  /**
   * The classes of the workflow's own reporters, built for every journey
   * before the reporters an instance adds.
   */
  readonly reporters?: readonly ReporterClass[];
}

/**
 * Declares a workflow: a class extending {@link Workflow} directly, whose
 * steps the `@withStep` decorators written below this one list, in the
 * order they run. It goes on the top line, above every `@withStep`.
 *
 * It checks the whole declaration when the class is defined, and makes the
 * workflow's descriptor, which `build()` hands to every workflow object.
 *
 * {@includeCode ../../examples/workflow.ts}
 *
 * @throws Violations, when the class is defined, listing every violation in
 * how the workflow is put together.
 * @throws Error, when the class is defined, if the name is empty, if the
 * class does not extend `Workflow` itself, or if it is declared twice.
 */
export function workflow(
  options: WorkflowOptions,
): (target: abstract new (...args: never[]) => Workflow) => void {
  return (target) => {
    const declaration = declarationOn(target);
    if (declaration.descriptor !== undefined) {
      throw new Error(`${target.name} is declared with @workflow twice`);
    }
    declaration.name = named<WorkflowName>(
      options.name,
      `workflow class ${target.name}`,
    );
    declaration.reporters = options.reporters ?? [];
    declaration.descriptor = assemble(declaration, target.name);
  };
}

/**
 * Adds a step to a workflow, after the steps listed on the lines below it:
 * the class of the step, declared with `@step`, and what the workflow says
 * about it, its name first.
 *
 * {@includeCode ../../examples/workflow.ts}
 *
 * @throws Error, when the class is defined, if the step is not declared with
 * `@step`, if its name is empty, if its retry budget is not a whole number
 * from 0, or if it is written above `@workflow`.
 */
export function withStep(
  step: StepClass,
  options: StepOptions,
): (target: abstract new (...args: never[]) => Workflow) => void {
  return (target) => {
    if (!isDeclared(step)) {
      throw new Error(`${step.name} is not declared with @step`);
    }
    const declaration = declarationOn(target);
    if (declaration.descriptor !== undefined) {
      throw new Error(
        `@withStep(${step.name}) is written above @workflow on ${target.name}: write @workflow on the top line`,
      );
    }
    declaration.steps.unshift(describeStep(step, options));
  };
}

/**
 * Marks the method of a workflow class that makes the journey ID of each of
 * its instances, in place of a random UUID. It is called with the workflow
 * object as `this`, while the instance is created, and returns the ID
 * synchronously.
 *
 * {@includeCode ../../examples/id-generator.ts}
 *
 * @throws Error, when the class is defined, if a parameter has no request,
 * if the class has another ID generator, or if the compiler option
 * `emitDecoratorMetadata` is off.
 */
export function idGenerator(): IdGeneratorDecorator {
  return (prototype, key, method) => {
    requireMetadata(prototype, key);
    const generate = method.value;
    if (generate === undefined) {
      throw new Error(`@idGenerator marks a method, not ${String(key)}`);
    }
    refuseMethodParameters(prototype, key);
    const declaration = declarationOn(prototype.constructor);
    if (declaration.idGenerator !== undefined) {
      throw new Error(
        `${prototype.constructor.name} has more than one ID generator`,
      );
    }
    declaration.idGenerator = generate;
  };
}

/**
 * The decorator {@link idGenerator} makes, which TypeScript calls once, with
 * the method it marks, when the class is defined.
 *
 * {@includeCode ../../examples/id-generator.ts}
 */
export interface IdGeneratorDecorator {
  /**
   * Marks the method `key` of a workflow class, given its prototype.
   *
   * @typeParam M The type of the method, which takes nothing and returns the
   * journey ID.
   */
  <M extends () => string>(
    prototype: Workflow,
    key: string | symbol,
    method: TypedPropertyDescriptor<M>,
  ): void;
}

function declarationOn(target: { readonly name: string }): Declaration {
  if (Object.getPrototypeOf(target) !== Workflow) {
    throw new Error(`${target.name} must extend Workflow itself`);
  }
  return declarationOf(target);
}
