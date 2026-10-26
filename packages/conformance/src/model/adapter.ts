import { ModelError } from "./error.js";
import {
  nonValue,
  scripted,
  type Scripted,
  valueType,
  type ValueType,
} from "./value.js";

/**
 * What a scenario says one scripted input adapter does: the steps it is
 * attached to, what it requests, and what it answers for each input.
 */
export interface AdapterScript {
  readonly name: string;
  /** The steps it is attached to, by name, a rescue step by its own. */
  readonly steps: readonly [string, ...string[]];
  /** Its own requests, in the order their sentences are written. */
  readonly requests: AdapterRequest[];
  /** What it answers for an input; for any other input it returns nothing. */
  readonly answers: Answering[];
  /** What it writes through its data bag access on every call, in order. */
  readonly writes: [string, Scripted][];
  /** The step for whose inputs it keeps the data bag access it is given. */
  keepsAccessFor?: string;
}

/** A request of an input adapter, as the cases script one. */
export type AdapterRequest =
  | { readonly kind: "data bag" }
  | { readonly kind: "step name" }
  | {
      readonly kind: "data from the workflow";
      readonly key: string;
      readonly type: ValueType;
    };

/**
 * What an input adapter answers for the input of a key, when called for
 * any step, or only for the step named.
 */
interface Answering {
  readonly key: string;
  readonly step?: string;
  readonly answer: Answer;
}

/** What an input adapter does when it is called for an input. */
export type Answer =
  | { readonly kind: "returns"; readonly value: Scripted }
  | { readonly kind: "returns nothing" }
  | { readonly kind: "fails"; readonly message: string }
  | { readonly kind: "returns the step name" }
  | {
      readonly kind: "returns what it reads";
      readonly key: string;
      readonly type: ValueType;
      readonly through: "its access" | "the kept access";
    };

/** An adapter that does nothing yet, attached to the steps. */
export function unscriptedAdapter(
  name: string,
  steps: readonly [string, ...string[]],
): AdapterScript {
  return { name, steps, requests: [], answers: [], writes: [] };
}

const readFromTheDataBag = /^"([^"]*)" of type (\w+), read from the data bag,$/;

/** Whether an input adapter's script is of the adapter named `name`. */
export function adapterNamed(
  name: string,
): (adapter: AdapterScript) => boolean {
  return (adapter) => adapter.name === name;
}

/**
 * What a "returns" sentence says an adapter answers, from what it writes
 * between "returns" and "for": nothing, a non-value, a key read from the
 * data bag, or a value written as JSON.
 */
export function answerOf(written: string): Answer {
  if (written === "nothing") {
    return { kind: "returns nothing" };
  }
  if (written === "a non-value") {
    return { kind: "returns", value: nonValue };
  }
  const read = readFromTheDataBag.exec(written);
  if (read === null) {
    return { kind: "returns", value: scripted(written) };
  }
  const [, key = "", type = ""] = read;
  return {
    kind: "returns what it reads",
    key,
    type: valueType(type),
    through: "its access",
  };
}

/** What the script answers for the input of `key`, called for `step`. */
export function answerFor(
  script: AdapterScript,
  step: string,
  key: string,
): Answer {
  return (
    script.answers.find((answering) => isFor(answering, step, key))?.answer ??
    nothing
  );
}

function isFor(answering: Answering, step: string, key: string): boolean {
  return (
    answering.key === key &&
    (answering.step === undefined || answering.step === step)
  );
}

const nothing: Answer = { kind: "returns nothing" };

/** The adapter of the scripts attached to the step, which must have one. */
export function adapterOf(
  scripts: readonly AdapterScript[],
  step: string,
): AdapterScript {
  const script = scripts.find((attached) => isAttachedTo(attached, step));
  if (script === undefined) {
    throw new ModelError(`no input adapter is attached to "${step}"`);
  }
  return script;
}

function isAttachedTo(script: AdapterScript, step: string): boolean {
  return script.steps.includes(step);
}

/**
 * Refuses a script that uses a data bag access the adapter could never
 * hold: one it does not request, or one it never keeps.
 *
 * @throws ModelError when it writes, keeps an access or reads through its
 * own without requesting the data bag, or reads through a kept access
 * without keeping one.
 */
export function refuseUnheldAccess(script: AdapterScript): void {
  if (usesItsAccess(script) && !script.requests.some(isForTheDataBag)) {
    throw new ModelError(
      `the input adapter "${script.name}" uses a data bag access it does not request`,
    );
  }
  if (
    script.keepsAccessFor === undefined &&
    script.answers.some(readsThroughTheKeptAccess)
  ) {
    throw new ModelError(
      `the input adapter "${script.name}" reads through a data bag access it never keeps`,
    );
  }
}

function usesItsAccess(script: AdapterScript): boolean {
  return (
    script.writes.length > 0 ||
    script.keepsAccessFor !== undefined ||
    script.answers.some(readsThroughItsAccess)
  );
}

function readsThroughItsAccess({ answer }: Answering): boolean {
  return (
    answer.kind === "returns what it reads" && answer.through === "its access"
  );
}

function readsThroughTheKeptAccess({ answer }: Answering): boolean {
  return (
    answer.kind === "returns what it reads" &&
    answer.through === "the kept access"
  );
}

/** Whether the request is for the data bag. */
export function isForTheDataBag(request: AdapterRequest): boolean {
  return request.kind === "data bag";
}

/** Whether the request is for the step name. */
export function isForTheStepName(request: AdapterRequest): boolean {
  return request.kind === "step name";
}
