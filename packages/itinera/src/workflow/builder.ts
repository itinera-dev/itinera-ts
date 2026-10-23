import { requestsOf } from "../declaration.js";
import { named } from "../name.js";
import type { ReporterClass } from "../report.js";
import type { StepClass, StepDescriptor, StepOptions } from "../step.js";
import { requestsOfStep } from "../step/declared.js";
import { describeStep } from "../step/descriptor.js";
import type { Built, Workflow, WorkflowName } from "../workflow.js";
import { assemble, type WorkflowDescriptor } from "./descriptor.js";
import type { Declaration, IdGenerator } from "./registry.js";

/**
 * The names of the methods of `W` that can make a journey ID: those taking
 * nothing and returning a string.
 *
 * {@includeCode ../../examples/builder.ts}
 */
export type IdGeneratorKey<W> = {
  [K in keyof W & (string | symbol)]: W[K] extends () => string ? K : never;
}[keyof W & (string | symbol)];

/**
 * Puts a workflow together, starting from what the decorators of its class
 * `C` declared, and makes its workflow object. `Orders.builder()` makes one.
 *
 * Each method adds to what the workflow will have and returns the builder.
 * `build()` checks the whole workflow, then calls the constructor of `C`
 * with the arguments `constructWith` was given. `Ready` says whether those
 * arguments are known: `build()` does not compile until they are, unless
 * the constructor takes none.
 *
 * {@includeCode ../../examples/builder.ts}
 */
export class WorkflowBuilder<
  C extends new (...args: never[]) => Workflow,
  Ready extends boolean = [] extends ConstructorParameters<C> ? true : false,
> {
  declare private readonly ready: Ready;
  readonly #workflow: C;
  #name: WorkflowName | undefined;
  readonly #steps: StepDescriptor[];
  readonly #reporters: ReporterClass[];
  #idGenerator: IdGenerator | undefined;
  #args: ConstructorParameters<C> | undefined;
  readonly #attach: Attach;

  /**
   * Starts from what the decorators of `workflow` declared, and gives each
   * workflow object it builds its descriptor through `attach`.
   */
  constructor(workflow: C, declared: Declaration, attach: Attach) {
    this.#workflow = workflow;
    this.#attach = attach;
    this.#name = declared.name;
    this.#steps = [...declared.steps];
    this.#reporters = [...declared.reporters];
    this.#idGenerator = declared.idGenerator;
  }

  /**
   * Names the workflow, in place of the name `@workflow` gave it.
   *
   * @throws Error if the name is empty.
   */
  name(name: string): this {
    this.#name = named<WorkflowName>(
      name,
      `workflow class ${this.#workflow.name}`,
    );
    return this;
  }

  /**
   * Adds a step after the steps the workflow has so far: a class extending
   * `Step`, declared with `@step` or not, and what the workflow says about it.
   *
   * @throws Error if the name is empty, if the retry budget is not a whole
   * number from 0, or if a parameter of the step's constructor or of its
   * `run` has no request.
   */
  step(step: StepClass, options: StepOptions): this {
    requestsOfStep(step);
    this.#steps.push(describeStep(step, options));
    return this;
  }

  /** Adds a class of reporters, after those the workflow lists so far. */
  reporter(reporter: ReporterClass): this {
    this.#reporters.push(reporter);
    return this;
  }

  /**
   * Makes the method `key` of the workflow class its ID generator, called
   * with the workflow object as `this` to make each instance's journey ID.
   *
   * @throws Error if the workflow has an ID generator already, if `key`
   * names a field rather than a method of the class, or if a parameter of the
   * method has no request.
   */
  idGenerator(key: IdGeneratorKey<InstanceType<C>>): this {
    if (this.#idGenerator !== undefined) {
      throw new Error(`${this.#workflow.name} has more than one ID generator`);
    }
    const prototype = this.#workflow.prototype as Workflow;
    const generate: unknown = Reflect.get(prototype, key);
    if (typeof generate !== "function") {
      throw new Error(
        `${this.#workflow.name}.${String(key)} is not a method of the class`,
      );
    }
    requestsOf(this.#workflow, key);
    this.#idGenerator = generate as IdGenerator;
    return this;
  }

  /**
   * Keeps the arguments the workflow class's constructor is called with when
   * the workflow is built.
   */
  constructWith(...args: ConstructorParameters<C>): WorkflowBuilder<C, true> {
    this.#args = args;
    return this as WorkflowBuilder<C, true>;
  }

  /**
   * Checks the whole workflow, then makes its workflow object, calling the
   * constructor with the arguments `constructWith` was given, and gives it
   * its new workflow descriptor.
   *
   * @throws Violations listing every violation in how the workflow is put
   * together, before the constructor runs.
   * @throws Error if the workflow has no name.
   */
  build(this: WorkflowBuilder<C, true>): Built<InstanceType<C>> {
    const descriptor = assemble(
      {
        name: this.#name,
        steps: this.#steps,
        reporters: this.#reporters,
        idGenerator: this.#idGenerator,
      },
      this.#workflow.name,
    );
    const made = new this.#workflow(...(this.#args ?? []));
    this.#attach(made, descriptor);
    return made as Built<InstanceType<C>>;
  }
}

/** Gives a workflow object its checked descriptor, as `build()` does. */
type Attach = (
  workflow: Workflow,
  descriptor: WorkflowDescriptor<Workflow>,
) => void;
