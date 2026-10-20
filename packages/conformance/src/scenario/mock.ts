/**
 * How a scenario's step, or rescue step, ends each attempt, as a step mock
 * or a rescue step mock plays it.
 */
import {
  Ending,
  type Reason,
  type RescueEnding,
  type RescueStepMockScript,
  type StepMockScript,
} from "itinera/unstable";
import { given } from "../given.js";
import { ModelError } from "../model/error.js";
import type { AttemptScript, ScriptedReason } from "../model/step/attempt.js";
import type { StepScript } from "../model/step.js";

/** The message of an abnormal termination the case scripts with none. */
const unwrittenMessage = "the scripted step terminated abnormally";

/** The step mock's script of the step's script. */
export function mockScriptOf(script: StepScript): StepMockScript {
  const [first = Ending.success, ...rest] = (script.attempts ?? []).map(
    endingOf,
  );
  return {
    attempts: [first, ...rest],
    asynchronous: script.asynchronous,
    ...buildFailureOf(script),
  };
}

/**
 * The rescue step mock's script of the rescue step's script.
 *
 * @throws ModelError when the script says the rescue step skips, which a
 * rescue step cannot do.
 */
export function rescueMockScriptOf(script: StepScript): RescueStepMockScript {
  const [first = Ending.success, ...rest] = (script.attempts ?? []).map(
    rescueEndingOf,
  );
  return {
    attempts: [first, ...rest],
    asynchronous: script.asynchronous,
    ...buildFailureOf(script),
  };
}

function buildFailureOf({ constructorFailure }: StepScript): {
  readonly buildFailure?: string;
} {
  return constructorFailure === undefined
    ? {}
    : { buildFailure: constructorFailure };
}

function rescueEndingOf(attempt: AttemptScript): RescueEnding {
  const ending = endingOf(attempt);
  if (ending.kind === "skipped") {
    throw new ModelError("a rescue step cannot skip");
  }
  return ending;
}

function endingOf({ outcome }: AttemptScript): Ending {
  switch (outcome.kind) {
    case "success":
      return Ending.success;
    case "failure":
      return Ending.failure(reasonOf(outcome.reason));
    case "skipped":
      return outcome.reason === undefined
        ? Ending.skip
        : Ending.skipBecause(reasonOf(outcome.reason));
    case "error":
      return Ending.abnormalTermination(outcome.message ?? unwrittenMessage);
  }
}

function reasonOf({ code, message, details }: ScriptedReason): Reason {
  return {
    code,
    ...(message === undefined ? {} : { message }),
    ...(details === undefined ? {} : { details: given(details) }),
  };
}
