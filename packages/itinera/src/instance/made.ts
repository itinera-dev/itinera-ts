import type { InstanceOptions, ValuesByKey } from "../instance.js";
import type { JourneyId } from "../journey.js";
import type { Reporter } from "../report.js";
import type { Value } from "../value.js";
import type { Workflow, WorkflowDescriptor } from "../workflow.js";

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
 * {@includeCode ../../examples/instance.ts}
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
  const journeyId = descriptor.generateJourneyId(workflow, data);
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
