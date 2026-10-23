import type { ServiceRequest } from "./provider.js";
import type { Attempts } from "./step/attempt.js";
import { nonValue, scripted, type Scripted, type CaseType } from "./value.js";

export { attempts, succeeds, type Attempts } from "./step/attempt.js";
export { contributedUnder, globalMetadataUnder } from "./step/given-under.js";

/**
 * What a scenario says one scripted step does: what it requests, how it is
 * built, what it does on every attempt and how each attempt ends.
 */
export interface StepScript {
  /** The inputs it requests, in the order declared. */
  readonly inputs: Input[];
  /** The services it requests, in the order declared. */
  readonly services: ServiceRequest[];
  /** Whether it has a rescue step, scripted under its rescue step's name. */
  hasRescueStep: boolean;
  /** Whether it is a rescue step. */
  isRescueStep: boolean;
  /** What it requests of the step it rescues, when it is a rescue step. */
  readonly rescueRequests: RescueRequest[];
  /** What it does on every attempt before ending, in the order written. */
  readonly actions: StepAction[];
  /** How each attempt ends; the last repeats. None until a sentence says. */
  attempts?: Attempts;
  /** The message its constructor fails with, when building it fails. */
  constructorFailure?: string;
  /** Its retry budget: after the first attempt, at most this many more. */
  retries: number;
  /** Whether its descriptor retries abnormal terminations, as by default. */
  retriesAbnormalTerminations: boolean;
  /** Whether it runs asynchronously. */
  asynchronous: boolean;
  /** Whether it catches the failure of an emit call and carries on. */
  ignoresFailedEmits: boolean;
  /** Whether it keeps its contributor and step reporter after its attempt. */
  keepsHandles: boolean;
  /** Whether its `run` declares a contributor and a step reporter, as by default. */
  declaresHandles: boolean;
  /** The step policies it has, in order, once stated. */
  policies?: readonly string[];
}

/** An input a step requests, of a type of the vocabulary. */
export interface Input {
  readonly key: string;
  readonly type: CaseType;
  readonly optional: boolean;
}

/**
 * What a rescue step requests of the failed attempt of the step it rescues:
 * data it contributed, the failure reason or the error.
 */
export type RescueRequest =
  | { readonly kind: "data"; readonly input: Input }
  | { readonly kind: "failure reason" }
  | { readonly kind: "error" };

/** The level of an event a step emits: `step_info`, `step_warning` or `step_error`. */
export type Level = "info" | "warning" | "error";

/** Something a scripted step does on every attempt, before it ends. */
export type StepAction =
  | {
      readonly kind: "contribute";
      readonly key: string;
      readonly value: Scripted;
    }
  | {
      readonly kind: "contribute then change";
      readonly key: string;
      readonly value: Scripted;
      readonly changed: Scripted;
    }
  | {
      readonly kind: "change input";
      readonly key: string;
      readonly value: Scripted;
    }
  | {
      readonly kind: "emit";
      readonly level: Level;
      readonly message: string;
      readonly data?: Scripted;
    }
  | {
      readonly kind: "set global metadata";
      readonly key: string;
      readonly value: Scripted;
    };

/** A step that does nothing yet. */
export function unscripted(): StepScript {
  return {
    inputs: [],
    services: [],
    hasRescueStep: false,
    isRescueStep: false,
    rescueRequests: [],
    actions: [],
    retries: 0,
    retriesAbnormalTerminations: true,
    asynchronous: false,
    ignoresFailedEmits: false,
    keepsHandles: false,
    declaresHandles: true,
  };
}

/** A step that does nothing yet, under its name. */
export function unscriptedAs(name: string): [string, StepScript] {
  return [name, unscripted()];
}

/** The name of a step's rescue step. */
export function rescueOf(step: string): string {
  return `${step}_rescue`;
}

const thenChanges = " and then changes it to ";

/**
 * A contribution of the key as a "contributes" sentence writes it after the
 * `=`: a value, or a value and the content it is then changed to.
 */
export function contribution(key: string, written: string): StepAction {
  const at = written.indexOf(thenChanges);
  return at === -1
    ? { kind: "contribute", key, value: scripted(written) }
    : {
        kind: "contribute then change",
        key,
        value: scripted(written.slice(0, at)),
        changed: scripted(written.slice(at + thenChanges.length)),
      };
}

/**
 * An event a step emits, with no data when the sentence gives none, or with
 * the data written after "with data": JSON, or "that is not a value".
 */
export function emit(
  level: Level,
  message: string,
  data: string | null,
): Extract<StepAction, { readonly kind: "emit" }> {
  return data === null
    ? { kind: "emit", level, message }
    : { kind: "emit", level, message, data: emitted(data) };
}

function emitted(data: string): Scripted {
  return data === "that is not a value" ? nonValue : scripted(data);
}
