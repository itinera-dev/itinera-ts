import type { JourneyId } from "../journey.js";
import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { Reporter, ReporterClass } from "../report.js";
import type { DeclaredProvider } from "../service/provider.js";
import type { StepDescriptor } from "../step.js";
import type { DeclaredAdapter } from "./adapter.js";
import type { Workflow, WorkflowName } from "../workflow.js";
import type { IdGenerator } from "./registry.js";
import { Violations, violationsOf } from "./violation.js";

declare const crypto: { randomUUID(): string };

let describing: (name: WorkflowName, parts: Parts) => WorkflowDescriptor;
let partsOf: (described: WorkflowDescriptor) => Parts;

/**
 * How a workflow is described to the executor: its name, its steps, its
 * policies, its reporters, and how it makes a journey ID. The executor reads this and
 * nothing else about the workflow, and passes the workflow object to the
 * calls that need it.
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
   * Builds the reporters the workflow lists, as new objects, for one new
   * instance.
   */
  reporters(): readonly Reporter[] {
    return this.#parts.reporters.map(build);
  }

  /**
   * Makes the journey ID of a new instance of the workflow object given, with
   * the workflow's ID generator or as a random UUID.
   *
   * @throws TypeError if the ID generator returns what is not a string.
   * @throws Whatever the ID generator throws.
   */
  generateJourneyId(workflow: Workflow): JourneyId {
    const { idGenerator } = this.#parts;
    const id: unknown =
      idGenerator === undefined
        ? crypto.randomUUID()
        : idGenerator.call(workflow);
    if (typeof id !== "string") {
      throw new TypeError(
        `the ID generator of workflow ${this.name} returned ${typeof id}, not a string`,
      );
    }
    return id as JourneyId;
  }
}

/** The lists a workflow descriptor is made from. */
export interface Parts {
  /** The workflow's name, if it was given one. */
  readonly name: WorkflowName | undefined;
  /** The step descriptors, in the order the steps run. */
  readonly steps: readonly StepDescriptor[];
  /** The classes of the workflow's own reporters. */
  readonly reporters: readonly ReporterClass[];
  /** The workflow policies attached to the workflow, in order. */
  readonly policies: readonly PolicyDescriptor[];
  /** The input adapters, in order. */
  readonly adapters: readonly DeclaredAdapter[];
  /** The service providers, in order. */
  readonly providers: readonly DeclaredProvider[];
  /** The method that makes each instance's journey ID, if there is one. */
  readonly idGenerator: IdGenerator | undefined;
}

/**
 * The workflow descriptor made from `parts`, for the workflow class named
 * `className`, once it is checked.
 *
 * @throws Violations listing every violation found.
 * @throws Error if the workflow has no name.
 */
export function assemble(parts: Parts, className: string): WorkflowDescriptor {
  if (parts.name === undefined) {
    throw new Error(
      `workflow ${className} has no name: give it one with @workflow or with its builder's name()`,
    );
  }
  const [first, ...more] = violationsOf(parts.steps);
  if (first !== undefined) {
    throw new Violations([first, ...more]);
  }
  return describing(parts.name, parts);
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
