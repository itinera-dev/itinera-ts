/**
 * Workflow instances: one per journey, holding its workflow, its initial
 * data, its journey ID, its reporters and its initial global metadata.
 *
 * @module
 */
import type { JourneyId } from "./journey.js";
import type { Reporter } from "./report.js";
import type { Value } from "./value.js";
import type { Workflow, WorkflowDescriptor } from "./workflow.js";

/**
 * Values by key, given as a `Map`, as entries, or as a plain object, whose
 * properties set to `undefined` are left out. A plain object puts keys that
 * look like whole numbers first, whatever the order they were written in, so
 * give a `Map` or entries when such keys must keep their order.
 *
 * {@includeCode ../examples/workflow.ts}
 */
export type ValuesByKey =
  | ReadonlyMap<string, Value>
  | Iterable<readonly [string, Value]>
  | { readonly [key: string]: Value | undefined };

/**
 * What an instance holds besides its initial data.
 *
 * {@includeCode ../examples/instance.ts}
 */
export interface InstanceOptions {
  /**
   * The instance's own reporters, added after those its workflow lists: each
   * a reporter, or a function that makes one from the instance's journey ID.
   */
  readonly reporters?: readonly (
    Reporter | ((journeyId: JourneyId) => Reporter)
  )[];
  /**
   * The initial global metadata, passed to every reporter after the journey
   * ID and before the journey starts, checked when the instance is run.
   */
  readonly reportersGlobalMetadata?: ValuesByKey;
}

let making: <W extends Workflow>(
  descriptor: WorkflowDescriptor,
  workflow: W,
  initialData: ReadonlyMap<string, Value>,
  journeyId: JourneyId,
  handed: Handed,
) => WorkflowInstance<W>;
let made: (given: unknown) => boolean;

/**
 * One instance of a workflow, for one journey: what the executor is given to
 * run. It holds the workflow descriptor and the workflow object side by
 * side, and what belongs to this journey alone.
 *
 * Only `instance()` on a workflow object makes one: an object written by
 * hand, with the same members, is not a workflow instance and does not
 * compile where one is expected, and `run` rejects with a `TypeError` one
 * that a cast lets through.
 *
 * {@includeCode ../examples/instance.ts}
 *
 * @typeParam W The class of the workflow object.
 */
export class WorkflowInstance<W extends Workflow = Workflow> {
  static {
    making = (descriptor, workflow, initialData, journeyId, handed) =>
      new WorkflowInstance(
        descriptor,
        workflow,
        initialData,
        journeyId,
        handed,
      );
    made = (given) =>
      typeof given === "object" && given !== null && #handed in given;
  }

  /** How the workflow is described to the executor. */
  readonly descriptor: WorkflowDescriptor;
  /** The workflow object, which the descriptor's calls are given. */
  readonly workflow: W;
  /** The initial content of the data bag, as given. */
  readonly initialData: ReadonlyMap<string, Value>;
  /** The journey ID, made when the instance was created. */
  readonly journeyId: JourneyId;
  #handed: Handed;

  private constructor(
    descriptor: WorkflowDescriptor,
    workflow: W,
    initialData: ReadonlyMap<string, Value>,
    journeyId: JourneyId,
    handed: Handed,
  ) {
    this.descriptor = descriptor;
    this.workflow = workflow;
    this.initialData = initialData;
    this.journeyId = journeyId;
    this.#handed = handed;
    Object.freeze(this);
  }

  /**
   * Hands the instance's reporters over, once: those its workflow lists, then
   * its own. Empty afterwards.
   */
  takeReporters(): readonly Reporter[] {
    const { reporters } = this.#handed;
    this.#handed = { ...this.#handed, reporters: [] };
    return reporters;
  }

  /** Hands the initial global metadata over, once: empty afterwards. */
  takeGlobalMetadata(): ReadonlyMap<string, Value> {
    const { globalMetadata } = this.#handed;
    this.#handed = { ...this.#handed, globalMetadata: new Map() };
    return globalMetadata;
  }
}

/**
 * Makes an instance of the workflow object `workflow`, described by
 * `descriptor`: its initial data, then its journey ID, then its reporters,
 * those its workflow lists before its own.
 */
export function instanceOf<W extends Workflow>(
  descriptor: WorkflowDescriptor,
  workflow: W,
  initialData: ValuesByKey = [],
  options: InstanceOptions = {},
): WorkflowInstance<W> {
  const data = mapOf(initialData);
  const journeyId = descriptor.generateJourneyId(workflow);
  const own = (options.reporters ?? []).map((reporter) =>
    madeFor(journeyId, reporter),
  );
  const reporters = [...descriptor.reporters(), ...own];
  return making(descriptor, workflow, data, journeyId, {
    reporters,
    globalMetadata: mapOf(options.reportersGlobalMetadata ?? []),
  });
}

/** Whether `given` is an instance that `instance()` made. */
export function isInstance(given: unknown): given is WorkflowInstance {
  return made(given);
}

/** What an instance hands over to the executor once. */
interface Handed {
  readonly reporters: readonly Reporter[];
  readonly globalMetadata: ReadonlyMap<string, Value>;
}

function madeFor(
  journeyId: JourneyId,
  reporter: Reporter | ((journeyId: JourneyId) => Reporter),
): Reporter {
  return typeof reporter === "function" ? reporter(journeyId) : reporter;
}

function mapOf(given: ValuesByKey): Map<string, Value> {
  return Symbol.iterator in given
    ? new Map(given)
    : new Map(Object.entries(given).filter(isSet));
}

function isSet(entry: [string, Value | undefined]): entry is [string, Value] {
  return entry[1] !== undefined;
}
