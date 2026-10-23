/**
 * The script of a scenario's step as a step mock plays it, refusing what
 * the runner cannot run yet.
 */
import { Ending, type StepMockScript } from "itinera/unstable";
import type { AttemptScript } from "../model/step/attempt.js";
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
    script.actions.length > 0 && "contributions, emits or global metadata",
    (script.hasRescueStep || script.isRescueStep) && "rescue steps",
    script.ignoresFailedEmits && "failed emits",
    script.keepsHandles && "kept handles",
  ].find(isNamed);
  if (notYet !== undefined) {
    throw new NotRunYet(notYet);
  }
}

function isNamed(what: string | false): what is string {
  return what !== false;
}

function endingOf(attempt: AttemptScript): Ending {
  if (attempt.contributes.length > 0) {
    throw new NotRunYet("contributions");
  }
  switch (attempt.outcome.kind) {
    case "success":
      return Ending.success;
    case "error":
      return Ending.abnormalTermination(
        attempt.outcome.message ?? unwrittenMessage,
      );
    case "failure":
    case "skipped":
      throw new NotRunYet("an attempt that fails or is skipped");
  }
}
