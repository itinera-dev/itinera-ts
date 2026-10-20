import type { JourneyId } from "../journey.js";
import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { Reporter, ReporterClass } from "../report.js";
import type { DeclaredProvider } from "../service/provider.js";
import { serving } from "../service/serving.js";
import type { StepDescriptor, StepName } from "../step.js";
import type { Value } from "../value.js";
import { adapting, type DeclaredAdapter } from "./adapter.js";
import type { Workflow, WorkflowName } from "../workflow.js";
import { type ListedStep, listingOf } from "./listing.js";
import { generatedBy } from "./id-generator.js";
import type { Parts } from "./descriptor/assemble.js";

declare const crypto: { randomUUID(): string };

let describing: (name: WorkflowName, parts: Parts) => WorkflowDescriptor;
let partsOf: (described: WorkflowDescriptor) => Parts;

/**
 * How a workflow is described to the executor: its name, its steps, its
 * policies, its reporters, how it asks an input adapter for an input, how it
 * asks a service provider for a service, how it makes a journey ID, and its
 * listing. The executor reads this and nothing else about the workflow, and
 * passes the workflow object to the calls that need it.
 *
 * Only itinera makes one, when a class declared with `@workflow` is defined
 * or when a workflow's builder builds it, after checking it, and it never
 * changes afterwards: an object written by hand, with the same members, is
 * not a workflow descriptor and does not compile where one is expected. It
 * is the executor's contract, not a way to declare a workflow.
 *
 * {@includeCode ../../examples/descriptors.ts}
 */
export class WorkflowDescriptor {
  static {
    describing = (name, parts) => new WorkflowDescriptor(name, parts);
    partsOf = (described) => described.#parts;
  }

  /** The workflow's name, which every event of its journeys carries. */
  readonly name: WorkflowName;
  readonly #parts: Parts;

  private constructor(name: WorkflowName, parts: Parts) {
    this.name = name;
    this.#parts = Object.freeze({
      name,
      steps: Object.freeze([...parts.steps]),
      reporters: Object.freeze([...parts.reporters]),
      policies: Object.freeze([...parts.policies]),
      adapters: Object.freeze([...parts.adapters]),
      providers: Object.freeze([...parts.providers]),
      idGenerator: parts.idGenerator,
    });
    Object.freeze(this);
  }

  /** The workflow's steps, in the order they run. */
  steps(): readonly StepDescriptor[] {
    return this.#parts.steps;
  }

  /**
   * The workflow policies attached to the workflow, in the order their
   * hooks are looked up.
   */
  policies(): readonly PolicyDescriptor[] {
    return this.#parts.policies;
  }

  /**
   * Lists the workflow's steps in order, without running anything: each
   * step's name, its position, the names of its policies, the name of its
   * input adapter, if it has one, the services it requests, each with the
   * provider that serves it, and a rescue section for a step with a rescue
   * step.
   *
   * {@includeCode ../../examples/listing.ts}
   */
  listing(): readonly ListedStep[] {
    return listingOf(this.#parts);
  }

  /**
   * Builds the reporters the workflow lists, as new objects, for one new
   * instance.
   */
  reporters(): readonly Reporter[] {
    return this.#parts.reporters.map(build);
  }

  /**
   * Asks the input adapter attached to the step `step` for one of the
   * step's inputs: calls the adapter's method on the workflow object given,
   * with `answers`, what its requests were answered with, in the order the
   * adapter declares them, and gives what the method returns.
   *
   * {@includeCode ../../examples/descriptors.ts}
   *
   * @throws TypeError if no input adapter is attached to the step.
   * @throws Whatever the adapter's method throws.
   */
  adapt(
    workflow: Workflow,
    step: StepName,
    answers: readonly unknown[],
  ): unknown {
    const adapter = adapting(this.#parts.adapters, step);
    if (adapter === undefined) {
      throw new TypeError(
        `no input adapter of workflow ${this.name} is attached to step ${step}`,
      );
    }
    return Reflect.apply(adapter.method, workflow, answers);
  }

  /**
   * Asks the service provider serving the step `step` for the service under
   * `key`: calls the provider's method on the workflow object given, with
   * `answers`, what its requests were answered with, in the order the
   * provider declares them, and gives what the method returns.
   *
   * {@includeCode ../../examples/descriptors.ts}
   *
   * @throws TypeError if no service provider serves the step under the key.
   * @throws Whatever the provider's method throws.
   */
  provide(
    workflow: Workflow,
    step: StepName,
    key: string,
    answers: readonly unknown[],
  ): unknown {
    const provider = serving(this.#parts.providers, step, key);
    if (provider === undefined) {
      throw new TypeError(
        `no service provider of workflow ${this.name} serves step ${step} under the key ${key}`,
      );
    }
    return Reflect.apply(provider.method, workflow, answers);
  }

  /**
   * Makes the journey ID of a new instance of the workflow object given,
   * holding `initialData`, with the workflow's ID generator or as a random
   * UUID.
   *
   * @throws TypeError if the ID generator returns what is not a string.
   * @throws Whatever the ID generator throws.
   */
  generateJourneyId(
    workflow: Workflow,
    initialData: ReadonlyMap<string, Value>,
  ): JourneyId {
    const { idGenerator } = this.#parts;
    const id: unknown =
      idGenerator === undefined
        ? crypto.randomUUID()
        : generatedBy(idGenerator, workflow, initialData);
    if (typeof id !== "string") {
      throw new TypeError(
        `the ID generator of workflow ${this.name} returned ${typeof id}, not a string`,
      );
    }
    return id as JourneyId;
  }
}

/**
 * The workflow descriptor of the workflow named `name`, made from `parts`,
 * which are checked already.
 */
export function describedAs(
  name: WorkflowName,
  parts: Parts,
): WorkflowDescriptor {
  return describing(name, parts);
}

/** The input adapters of the workflow `described`, in order. */
export function adaptersOf(
  described: WorkflowDescriptor,
): readonly DeclaredAdapter[] {
  return partsOf(described).adapters;
}

/** The service providers of the workflow `described`, in order. */
export function providersOf(
  described: WorkflowDescriptor,
): readonly DeclaredProvider[] {
  return partsOf(described).providers;
}

function build(reporter: ReporterClass): Reporter {
  return new reporter();
}
