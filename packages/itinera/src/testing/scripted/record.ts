import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { JourneyResult, Read } from "../../journey.js";
import { dataBagOf } from "../../journey/data-bag.js";
import { None, type Option, Some } from "../../option.js";
import type { Attempt, StepName } from "../../step.js";
import type { PlainValue } from "../../value.js";
import type { Optional, RequestType } from "../../value/token.js";
import { MistakeKind, TestMistake } from "../mistake.js";

/**
 * An attempt handed to the construction of its step, with the values its
 * requests found, by key.
 */
export interface Built {
  readonly step: StepName;
  readonly attempt: Attempt;
  readonly values: ReadonlyMap<string, PlainValue>;
}

let runMade: (
  result: JourneyResult,
  names: readonly StepName[],
  built: readonly Built[],
) => ScriptedRun;
let stepMade: (name: StepName, built: readonly Built[]) => StepRecord;
let attemptMade: (built: Built) => AttemptRecord;

/**
 * What a scripted run gives once its journey ends: the journey's result, and
 * a record of every step and rescue step of the workflow, those the journey
 * never reached included. Only itinera makes one.
 *
 * {@includeCode ../../../examples/scripted.ts}
 */
export class ScriptedRun {
  static {
    runMade = (result, names, built) => new ScriptedRun(result, names, built);
  }

  /** The journey's result, as the executor's `run` resolves to it. */
  readonly result: JourneyResult;
  readonly #steps: ReadonlyMap<string, StepRecord>;

  private constructor(
    result: JourneyResult,
    names: readonly StepName[],
    built: readonly Built[],
  ) {
    this.result = result;
    this.#steps = new Map(names.map((name) => recordOf(name, built)));
  }

  /**
   * The record of the step, or rescue step, named `name`.
   *
   * @throws TestMistake when the workflow has no step or rescue step named
   * `name`.
   */
  step(name: string): StepRecord {
    const record = this.#steps.get(name);
    if (record === undefined) {
      throw new TestMistake([{ kind: MistakeKind.UnknownStep, step: name }]);
    }
    return record;
  }
}

/**
 * What a scripted run records of one step or rescue step: each attempt
 * handed to the construction of its step, scripted or real. An attempt that
 * ended before its step's constructor was called, because an input or a
 * service could not be resolved, is not in it; one whose constructor failed
 * is. Only itinera makes one.
 *
 * {@includeCode ../../../examples/scripted.ts}
 */
export class StepRecord {
  static {
    stepMade = (name, built) => new StepRecord(name, built);
  }

  /** Its attempts, in order. */
  readonly attempts: readonly AttemptRecord[];

  private constructor(name: StepName, built: readonly Built[]) {
    this.attempts = Object.freeze(
      built.filter(belongingTo(name)).map(attemptRecord),
    );
  }

  /** Its attempt numbered `number`, or `None` when it has no such attempt. */
  attempt(number: number): Option<AttemptRecord> {
    const found = this.attempts.find(numbered(number));
    return found === undefined ? None : Some(found);
  }
}

/**
 * What a scripted run records of one attempt: its number, and the values its
 * step was built with. Only itinera makes one.
 *
 * {@includeCode ../../../examples/scripted.ts}
 */
export class AttemptRecord {
  static {
    attemptMade = (built) => new AttemptRecord(built);
  }

  /** The attempt. */
  readonly number: Attempt;
  readonly #values: ReadonlyMap<string, PlainValue>;

  private constructor(built: Built) {
    this.number = built.attempt;
    this.#values = built.values;
  }

  /**
   * Reads, as the type `type` checks, the value under `key` that the step
   * was built with: an input, or, for a rescue step, a contribution it
   * requested from the failed attempt. It reads as the data bag's `read`
   * does: present, absent or of another type.
   *
   * {@includeCode ../../../examples/scripted.ts}
   */
  input<S extends StandardSchemaV1>(
    key: string,
    type: S,
  ): Read<StandardSchemaV1.InferInput<S>>;
  input<S extends StandardSchemaV1>(
    key: string,
    type: Optional<S>,
  ): Read<Option<StandardSchemaV1.InferInput<S>>>;
  input(key: string, type: RequestType): Read<unknown> {
    return dataBagOf(this.#values).read(key, type);
  }
}

/**
 * The scripted run of a journey that ended with `result`, recording the
 * steps and rescue steps named `names`, from every attempt `built`.
 */
export function scriptedRun(
  result: JourneyResult,
  names: readonly StepName[],
  built: readonly Built[],
): ScriptedRun {
  return runMade(result, names, built);
}

function recordOf(
  name: StepName,
  built: readonly Built[],
): [StepName, StepRecord] {
  return [name, stepMade(name, built)];
}

function belongingTo(name: StepName): (built: Built) => boolean {
  return (built) => built.step === name;
}

function attemptRecord(built: Built): AttemptRecord {
  return attemptMade(built);
}

function numbered(number: number): (attempt: AttemptRecord) => boolean {
  return (attempt) => attempt.number.number === number;
}
