/**
 * Workflows: the base class every workflow extends, how its steps are
 * declared, what a workflow and its parts are called, and how a workflow is
 * described to the executor.
 *
 * @module
 */
import {
  type InstanceOptions,
  instanceOf,
  type ValuesByKey,
  type WorkflowInstance,
} from "./instance.js";
import { type Provided, provided } from "./service/provider.js";
import type { AsValue } from "./value.js";
import { fromBag, type Supplied, supplied } from "./workflow/adapter.js";
import { WorkflowBuilder } from "./workflow/builder.js";
import type { WorkflowDescriptor } from "./workflow/descriptor.js";
import type { ListedStep } from "./workflow/listing.js";
import type { Built } from "./workflow/names.js";
import { declarationOf, declaredDescriptor } from "./workflow/registry.js";

export {
  withStep,
  workflow,
  type WorkflowClass,
  type WorkflowOptions,
} from "./workflow/decorators.js";
export {
  type FromDataBag,
  inputAdapter,
  type InputAdapterDecorator,
  type InputAdapterOptions,
  key,
  type Supplied,
  type SuppliedValue,
} from "./workflow/adapter.js";
export type {
  Answer,
  KeyIn,
  ParameterOf,
  Place,
  ReadFromMetadata,
  RequestDecorator,
  Strict,
  ValueRequestDecorator,
} from "./declaration/parameter.js";
export type {
  Given,
  MethodKey,
  ParametersOf,
  Token,
  Tokens,
} from "./declaration/token.js";
export type { WorkflowBuilder } from "./workflow/builder.js";
export {
  idGenerator,
  type IdGeneratorDecorator,
  type IdGeneratorKey,
} from "./workflow/id-generator.js";
export { fromWorkflow } from "./workflow/request.js";
export type { WorkflowDescriptor } from "./workflow/descriptor.js";
export type {
  ListedRescue,
  ListedService,
  ListedStep,
  Position,
} from "./workflow/listing.js";
export type { AdapterName, Built, WorkflowName } from "./workflow/names.js";
export type {
  AttemptRequestInJourneyScope,
  DuplicateProviderName,
  DuplicateStepName,
  InputAdapterForUnknownStep,
  RescuedStepRetried,
  ServiceNotProvided,
  ServiceProvidedTwice,
  ServiceProviderForUnknownStep,
  ServiceRequestedTwice,
  StepAdaptedTwice,
  StepHookDefinedTwice,
  WorkflowHookDefinedTwice,
  WrongServiceType,
  Violation,
} from "./workflow/violation.js";
export { ViolationKind, Violations } from "./workflow/violation.js";

/**
 * The base class of every workflow. A class extending it is the workflow's
 * own code: its fields are what the workflow needs, given to its constructor,
 * and its methods are what its decorators mark, such as its ID generator.
 *
 * The static `build()` makes the workflow object an application runs, never
 * `new`, or `builder()` when it adds to what the decorators declared or puts
 * the workflow together without them, and the object's `instance()` makes
 * one instance of the workflow per journey. A workflow inherits nothing the
 * executor calls: the executor reads the workflow's
 * {@link WorkflowDescriptor}, which `build()` gives the object.
 *
 * {@includeCode ../examples/workflow.ts}
 */
export abstract class Workflow {
  #descriptor: WorkflowDescriptor | undefined;

  /**
   * Makes the workflow object of a class declared with `@workflow`, calling
   * its constructor with the arguments given, and gives it the workflow
   * descriptor made when the class was defined.
   *
   * @throws Error if the class is not declared with `@workflow`.
   */
  static build<C extends new (...args: never[]) => Workflow>(
    this: C,
    ...args: ConstructorParameters<C>
  ): Built<InstanceType<C>> {
    const descriptor = declaredDescriptor(this);
    const made = new this(...args);
    made.#init(descriptor);
    return made as Built<InstanceType<C>>;
  }

  /**
   * Lists the steps the decorators of the class declared, in order, without
   * running anything and without a workflow object, as its workflow
   * descriptor's `listing()` does.
   *
   * {@includeCode ../examples/listing.ts}
   *
   * @throws Error if the class is not declared with `@workflow`.
   */
  static listing(
    this: new (...args: never[]) => Workflow,
  ): readonly ListedStep[] {
    return declaredDescriptor(this).listing();
  }

  /**
   * Starts putting the workflow together from what the decorators of the
   * class declared, if anything, adding to it what the decorators cannot
   * say, or everything, for a class declared without them.
   *
   * {@includeCode ../examples/builder.ts}
   *
   * @throws Error if the class does not extend `Workflow` itself.
   */
  static builder<C extends new (...args: never[]) => Workflow>(
    this: C,
  ): WorkflowBuilder<C> {
    if (Object.getPrototypeOf(this) !== Workflow) {
      throw new Error(`${this.name} must extend Workflow itself`);
    }
    return new WorkflowBuilder(
      this,
      declarationOf(this),
      (made, descriptor) => {
        made.#init(descriptor);
      },
    );
  }

  /**
   * Makes one instance of the workflow, for one journey: its initial data,
   * then its journey ID, made by the workflow's ID generator or as a random
   * UUID, then its reporters, after those the workflow lists.
   *
   * @param initialData The initial content of the data bag, checked when the
   * instance is run.
   * @param options The instance's own reporters and initial global metadata.
   * @throws Error if the object was not made by `build()`.
   * @throws Whatever the ID generator, or a function making a reporter,
   * throws.
   */
  instance(
    this: Built<this>,
    initialData?: ValuesByKey,
    options?: InstanceOptions,
  ): WorkflowInstance<this> {
    const descriptor = this.#descriptor;
    if (descriptor === undefined) {
      throw new Error(
        `this ${this.constructor.name} was made with new: make it with ${this.constructor.name}.build()`,
      );
    }
    return instanceOf<this>(descriptor, this, initialData, options);
  }

  /**
   * What an input adapter returns to supply `value` to the input it is asked
   * for, which compiles only when `value` is a value.
   *
   * {@includeCode ../examples/input-adapter.ts}
   */
  protected supply<T>(value: T & AsValue<T>): Supplied {
    return supplied(value);
  }

  /**
   * What an input adapter returns to supply nothing, so that the input it is
   * asked for is read from the data bag under its key.
   *
   * {@includeCode ../examples/input-adapter.ts}
   */
  protected fromDataBag(): Supplied {
    return fromBag;
  }

  /**
   * What a service provider returns to lend `instance` to the step, with
   * `data` for reporters, which compiles only when it is a value.
   *
   * {@includeCode ../examples/provider.ts}
   */
  protected provide<T, D = undefined>(
    instance: T,
    data?: D & AsValue<D>,
  ): Provided<T> {
    return provided(instance, data);
  }

  #init(descriptor: WorkflowDescriptor): void {
    this.#descriptor = descriptor;
  }
}
