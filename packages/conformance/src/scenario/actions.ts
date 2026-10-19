/**
 * What a scenario's step does on each attempt before it ends, as the runner
 * plays it through the handles itinera lends the step's `run`.
 */
import type { Contributor, StepReporter } from "itinera/unstable";
import type { PlainValue } from "itinera/value";
import { fresh, given } from "../given.js";
import { ModelError } from "../model/error.js";
import type { Input, StepAction, StepScript } from "../model/step.js";
import type { AttemptScript } from "../model/step/attempt.js";

/** An attempt of a scripted step: what it was built with and the handles it is lent. */
interface Attempting {
  /** Which attempt it is, counted from 0 among the steps its class built. */
  readonly attempt: number;
  /** The inputs it was built with, in the order the script declares them. */
  readonly inputs: readonly unknown[];
  /** The attempt's contributor. */
  readonly contributor: Contributor;
  /** The attempt's step reporter. */
  readonly reporter: StepReporter;
}

/**
 * Plays what a scripted step does before an attempt ends: its actions, in
 * the order written, awaiting each call on the step reporter, then what the
 * attempt contributes.
 */
export type Acting = (attempting: Attempting) => Promise<void>;

/**
 * What the step's script does before each attempt ends, or nothing when it
 * does nothing. An emit call that fails ends the attempt there, unless the
 * script ignores failed emits and carries on.
 *
 * @throws ModelError when the script changes an input the step never
 * requests.
 */
export function actingOf(script: StepScript): Acting | undefined {
  const unrequested = script.actions.find(changingUnrequestedOf(script));
  if (unrequested !== undefined) {
    throw new ModelError(
      `the step changes its input "${unrequested.key}", which it never requests`,
    );
  }
  const attempts = script.attempts ?? [];
  if (script.actions.length === 0 && !attempts.some(hasContributions)) {
    return undefined;
  }
  return async (attempting) => {
    for (const action of script.actions) {
      await acted(script, action, attempting);
    }
    const contributions =
      attempts[Math.min(attempting.attempt, attempts.length - 1)]
        ?.contributes ?? [];
    for (const [key, value] of contributions) {
      attempting.contributor.contribute(key, value);
    }
  };
}

type ChangeInput = Extract<StepAction, { readonly kind: "change input" }>;

function changingUnrequestedOf(
  script: StepScript,
): (action: StepAction) => action is ChangeInput {
  return (action) => changesUnrequested(script, action);
}

function changesUnrequested(
  script: StepScript,
  action: StepAction,
): action is ChangeInput {
  return (
    action.kind === "change input" && !script.inputs.some(keyed(action.key))
  );
}

function hasContributions(attempt: AttemptScript): boolean {
  return attempt.contributes.length > 0;
}

async function acted(
  script: StepScript,
  action: StepAction,
  { inputs, contributor, reporter }: Attempting,
): Promise<void> {
  switch (action.kind) {
    case "contribute":
      contributor.contribute(action.key, given(action.value));
      return;
    case "contribute then change": {
      const value = fresh(action.value);
      contributor.contribute(action.key, value);
      changeInPlace(value, given(action.changed));
      return;
    }
    case "change input":
      changeInPlace(
        inputs[script.inputs.findIndex(keyed(action.key))],
        given(action.value),
      );
      return;
    case "emit": {
      const emitting = emitted(reporter, action);
      await (script.ignoresFailedEmits ? emitting.catch(ignore) : emitting);
      return;
    }
    case "set global metadata":
      await reporter.setGlobalMetadata(action.key, given(action.value));
  }
}

function keyed(key: string): (input: Input) => boolean {
  return (input) => isInputOf(input, key);
}

function isInputOf(input: Input, key: string): boolean {
  return input.key === key;
}

function emitted(
  reporter: StepReporter,
  action: Extract<StepAction, { readonly kind: "emit" }>,
): Promise<void> {
  const { level, message, data } = action;
  return data === undefined
    ? reporter[level](message)
    : reporter[level]<PlainValue>(message, given(data));
}

function ignore(): void {
  // The step carries on, as its script says, after an emit that failed.
}

/**
 * Changes `target` in place to hold `content`, as far as the language
 * allows: the elements of a list, or the properties of a plain object, and
 * nothing for any other value, which cannot be changed in place.
 */
function changeInPlace(target: unknown, content: PlainValue): void {
  if (isList(target) && isListValue(content)) {
    target.splice(0, target.length, ...content);
  } else if (isPlainObject(target) && isPlainObject(content)) {
    Object.keys(target).forEach((key) => Reflect.deleteProperty(target, key));
    Object.assign(target, content);
  }
}

function isList(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isListValue(value: PlainValue): value is readonly PlainValue[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
