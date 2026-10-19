/**
 * How a scenario's step ends each attempt, as a step mock plays it,
 * refusing what the runner cannot run yet.
 */
import { Ending, type Reason, type StepMockScript } from "itinera/unstable";
import { given } from "../given.js";
import type { AttemptScript, ScriptedReason } from "../model/step/attempt.js";
import type { StepScript } from "../model/step.js";

/** The message of an abnormal termination the case scripts with none. */
const unwrittenMessage = "the scripted step terminated abnormally";

/**
 * A sentence of the case that the runner cannot run yet, because the stage
 * of itinera that makes it run has not landed.
 */
class NotRunYet extends Error {
  override readonly name = "NotRunYet";

  constructor(what: string) {
    super(`the runner cannot run ${what} yet`);
  }
}

/**
 * The step mock's script of the step's script.
 *
 * @throws NotRunYet when the step's script holds what the runner cannot run.
 */
export function mockScriptOf(script: StepScript): StepMockScript {
  refuseWhatDoesNotRunYet(script);
  const [first = Ending.success, ...rest] = (script.attempts ?? []).map(
    endingOf,
  );
  return {
    attempts: [first, ...rest],
    asynchronous: script.asynchronous,
    ...(script.constructorFailure === undefined
      ? {}
      : { buildFailure: script.constructorFailure }),
  };
}

function refuseWhatDoesNotRunYet(script: StepScript): void {
  const notYet = [
    (script.hasRescueStep || script.isRescueStep) && "rescue steps",
    script.keepsHandles && "kept handles",
  ].find(isNamed);
  if (notYet !== undefined) {
    throw new NotRunYet(notYet);
  }
}

function isNamed(what: string | false): what is string {
  return what !== false;
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
