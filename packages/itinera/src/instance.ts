/**
 * Workflow instances: one per journey, holding its workflow, its initial
 * data, its journey ID, its reporters and its initial global metadata.
 *
 * @module
 */
import type { JourneyId } from "./journey.js";
import type { Reporter } from "./report.js";
import type { Value } from "./value.js";
import type { WorkflowDescriptor } from "./workflow.js";

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

/**
 * One instance of a workflow, for one journey: what the executor is given to
 * run. It holds the workflow descriptor and the workflow object side by
 * side, and what belongs to this journey alone.
 *
 * `instance()` on a workflow object makes one. The interface is the
 * executor's contract, so an instance written by hand runs too.
 *
 * {@includeCode ../examples/instance.ts}
 */
export interface WorkflowInstance<W = unknown> {
  /** How the workflow is described to the executor. */
  readonly descriptor: WorkflowDescriptor<W>;
  /** The workflow object, which the descriptor's calls are given. */
  readonly workflow: W;
  /** The initial content of the data bag, as given. */
  readonly initialData: ReadonlyMap<string, Value>;
  /** The journey ID, made when the instance was created. */
  readonly journeyId: JourneyId;
  /**
   * Hands the instance's reporters over, once: those its workflow lists, then
   * its own. Empty afterwards.
   */
  takeReporters(): readonly Reporter[];
  /** Hands the initial global metadata over, once: empty afterwards. */
  takeGlobalMetadata(): ReadonlyMap<string, Value>;
}

/**
 * Makes an instance of the workflow object `workflow`, described by
 * `descriptor`: its initial data, then its journey ID, then its reporters,
 * those its workflow lists before its own.
 */
export function instanceOf<W>(
  descriptor: WorkflowDescriptor<W>,
  workflow: W,
  initialData: ValuesByKey = [],
  options: InstanceOptions = {},
): WorkflowInstance<W> {
  const data = mapOf(initialData);
  const journeyId = descriptor.generateJourneyId(workflow, data);
  const own = (options.reporters ?? []).map((reporter) =>
    madeFor(journeyId, reporter),
  );
  const reporters = [...descriptor.reporters(), ...own];
  return new Made(descriptor, workflow, data, journeyId, {
    reporters,
    globalMetadata: mapOf(options.reportersGlobalMetadata ?? []),
  });
}

class Made<W> implements WorkflowInstance<W> {
  #handed: Handed;

  constructor(
    readonly descriptor: WorkflowDescriptor<W>,
    readonly workflow: W,
    readonly initialData: ReadonlyMap<string, Value>,
    readonly journeyId: JourneyId,
    handed: Handed,
  ) {
    this.#handed = handed;
  }

  takeReporters(): readonly Reporter[] {
    const { reporters } = this.#handed;
    this.#handed = { ...this.#handed, reporters: [] };
    return reporters;
  }

  takeGlobalMetadata(): ReadonlyMap<string, Value> {
    const { globalMetadata } = this.#handed;
    this.#handed = { ...this.#handed, globalMetadata: new Map() };
    return globalMetadata;
  }
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
