import type { Request } from "../declaration/request.js";
import { AbortReason } from "../journey.js";
import type { Attempt, Outcome, Step, StepDescriptor } from "../step.js";
import { requestsOfDescribed } from "../step/descriptor.js";
import { hasDetailsRefused, isOutcome } from "../step/outcome.js";
import type { PlainValue } from "../value.js";
import { AttemptHandles } from "./handles.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { JourneyAbortError } from "./signal.js";

/**
 * How an attempt of a step ended once it ran: with the outcome it reported
 * and what it contributed, or in an abnormal termination, with the error
 * that ended it.
 */
export type Ran =
  | {
      readonly kind: "outcome";
      readonly outcome: Outcome;
      readonly contributed: ReadonlyMap<string, PlainValue>;
    }
  | { readonly kind: "abnormal termination"; readonly error: unknown };

/**
 * Runs the step built for `attempt`, lending its `run` the handles it
 * requests, in order, and closes them once the attempt and every call it
 * made on them have settled. An error escaping `run`, or what it returned
 * that is not an outcome, ends the attempt in an abnormal termination.
 *
 * @throws JourneyAbortError when the journey was aborted while the step ran,
 * whatever it did afterwards, or with `not a value` when its outcome's
 * reason was given details that are not a value.
 */
export async function ran(
  journey: Journey,
  step: StepDescriptor,
  attempt: Attempt,
  made: Step,
): Promise<Ran> {
  const handles = new AttemptHandles(journey, {
    kind: "step",
    step: step.name,
    attempt,
  });
  const lent = requestsOfDescribed(step).run.map((request) =>
    lending(journey, step, handles, request),
  );
  let ended: Ran;
  try {
    const returned: unknown = await made.run(...(lent as never[]));
    ended = endedWith(step, returned, handles);
  } catch (error) {
    ended = { kind: "abnormal termination", error };
  }
  await handles.settled();
  handles.close();
  const { recorded } = journey;
  if (recorded !== undefined) {
    throw new JourneyAbortError(recorded);
  }
  if (ended.kind === "outcome" && hasDetailsRefused(ended.outcome)) {
    throw journey.abort({ reason: AbortReason.NotAValue, step: step.name });
  }
  return ended;
}

function lending(
  journey: Journey,
  step: StepDescriptor,
  handles: AttemptHandles,
  request: Request,
): unknown {
  if (request.kind === "contributor") {
    return handles.contributor;
  }
  if (request.kind === "stepReporter") {
    return handles.reporter;
  }
  throw notLent(journey, step, request);
}

function notLent(
  journey: Journey,
  step: StepDescriptor,
  request: Request,
): JourneyAbortError {
  const error = new TypeError(
    `the run of step ${step.name} requests @${request.kind}, which itinera does not lend a step's run`,
  );
  return journey.abort({
    reason: AbortReason.StepCouldNotBeBuilt,
    step: step.name,
    source: { kind: "step" },
    errorMessage: messageOf(error),
    error,
  });
}

function endedWith(
  step: StepDescriptor,
  returned: unknown,
  handles: AttemptHandles,
): Ran {
  return isOutcome(returned)
    ? { kind: "outcome", outcome: returned, contributed: handles.contributed }
    : {
        kind: "abnormal termination",
        error: new TypeError(notAnOutcome(step, returned)),
      };
}

function notAnOutcome(step: StepDescriptor, returned: unknown): string {
  return `step ${step.name} returned ${typeof returned}, not an outcome made with its helpers`;
}
