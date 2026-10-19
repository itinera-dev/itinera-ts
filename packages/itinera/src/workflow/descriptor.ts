import type { JourneyId } from "../journey.js";
import type { Reporter, ReporterClass } from "../report.js";
import type { StepDescriptor } from "../step.js";
import type { Value } from "../value.js";
import type { Workflow, WorkflowName } from "../workflow.js";
import type { IdGenerator } from "./registry.js";
import { Violations, violationsOf } from "./violation.js";

declare const crypto: { randomUUID(): string };

/**
 * How a workflow is described to the executor: its name, its steps, its
 * reporters, and how it makes a journey ID. The executor reads this and
 * nothing else about the workflow, and passes the workflow object `W` to the
 * calls that need it, so it runs any workflow, however it was declared.
 *
 * itinera makes one when a class declared with `@workflow` is defined, or
 * when a workflow's builder builds it, after checking it, and it never
 * changes afterwards. It is the executor's contract, not a way to declare a
 * workflow.
 *
 * {@includeCode ../../examples/descriptors.ts}
 */
export interface WorkflowDescriptor<W = unknown> {
  /** The workflow's name, which every event of its journeys carries. */
  readonly name: WorkflowName;
  /** The workflow's steps, in the order they run. */
  steps(): readonly StepDescriptor[];
  /**
   * Builds the reporters the workflow lists, as new objects, for one new
   * instance.
   */
  reporters(): readonly Reporter[];
  /**
   * Makes the journey ID of a new instance of the workflow object given,
   * which may derive it from the instance's initial data.
   */
  generateJourneyId(workflow: W, data: ReadonlyMap<string, Value>): JourneyId;
}

/** The lists a workflow descriptor is made from. */
export interface Parts {
  /** The workflow's name, if it was given one. */
  readonly name: WorkflowName | undefined;
  /** The step descriptors, in the order the steps run. */
  readonly steps: readonly StepDescriptor[];
  /** The classes of the workflow's own reporters. */
  readonly reporters: readonly ReporterClass[];
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
export function assemble(
  parts: Parts,
  className: string,
): WorkflowDescriptor<Workflow> {
  if (parts.name === undefined) {
    throw new Error(
      `workflow ${className} has no name: give it one with @workflow or with its builder's name()`,
    );
  }
  const [first, ...more] = violationsOf(parts.steps);
  if (first !== undefined) {
    throw new Violations([first, ...more]);
  }
  return Object.freeze(new Described(parts.name, parts));
}

class Described implements WorkflowDescriptor<Workflow> {
  readonly name: WorkflowName;
  readonly #steps: readonly StepDescriptor[];
  readonly #reporters: readonly ReporterClass[];
  readonly #idGenerator: IdGenerator | undefined;

  constructor(name: WorkflowName, parts: Parts) {
    this.name = name;
    this.#steps = Object.freeze([...parts.steps]);
    this.#reporters = Object.freeze([...parts.reporters]);
    this.#idGenerator = parts.idGenerator;
  }

  steps(): readonly StepDescriptor[] {
    return this.#steps;
  }

  reporters(): readonly Reporter[] {
    return this.#reporters.map(build);
  }

  generateJourneyId(workflow: Workflow): JourneyId {
    const id: unknown =
      this.#idGenerator === undefined
        ? crypto.randomUUID()
        : this.#idGenerator.call(workflow);
    if (typeof id !== "string") {
      throw new TypeError(
        `the ID generator of workflow ${this.name} returned ${typeof id}, not a string`,
      );
    }
    return id as JourneyId;
  }
}

function build(reporter: ReporterClass): Reporter {
  return new reporter();
}
