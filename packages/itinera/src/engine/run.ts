import type { Request } from "../declaration/request.js";
import { AbortReason } from "../journey.js";
import type { Attempt, Outcome } from "../step.js";
import { hasDetailsRefused, isOutcome } from "../step/outcome.js";
import type { PlainValue } from "../value.js";
import type { BuiltStep } from "./build.js";
import type { Buildable } from "./buildable.js";
import { Handles } from "./handles.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { whatIs } from "./returned.js";
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
 * Runs the step, or rescue step, built for `attempt`, lending its `run` the
 * handles and the services it requests, in order, and closes the handles
 * once the attempt and every call it made on them have settled. An error
 * escaping `run` ends the attempt in an abnormal termination. For an attempt
 * a scripted run describes, the script plays in place of `run`, through the
 * same handles.
 *
 * @throws JourneyAbortError when the journey was aborted while the step ran,
 * whatever it did afterwards, with `unexpected result` when `run` returned
 * what is not an outcome, or with `not a value` when its outcome's reason
 * was given details that are not a value.
 */
export async function ran(
  journey: Journey,
  step: Buildable,
  attempt: Attempt,
  { made, services }: BuiltStep,
): Promise<Ran> {
  const handles = new Handles(journey, {
    kind: "step",
    step: step.name,
    attempt,
  });
  const lends: Lent = { handles, services };
  const lent = step.requests.run.map((request) =>
    lending(journey, step, lends, request),
  );
  const play = journey.script?.play(step.name, attempt);
  let ended: Ended;
  try {
    const returned: unknown = await (play === undefined
      ? made.run(...(lent as never[]))
      : play(handles));
    ended = { kind: "returned", returned };
  } catch (error) {
    ended = { kind: "abnormal termination", error };
  }
  await handles.closed();
  const { recorded } = journey;
  if (recorded !== undefined) {
    throw new JourneyAbortError(recorded);
  }
  if (ended.kind === "abnormal termination") {
    return ended;
  }
  const { returned } = ended;
  if (!isOutcome(returned)) {
    throw journey.abort({
      reason: AbortReason.UnexpectedResult,
      step: step.name,
      source: { kind: "step" },
      message: notAnOutcome(step, returned),
    });
  }
  if (hasDetailsRefused(returned)) {
    throw journey.abort({ reason: AbortReason.NotAValue, step: step.name });
  }
  return {
    kind: "outcome",
    outcome: returned,
    contributed: handles.contributed,
  };
}

/** How the call of `run` ended: with what it returned, or what it threw. */
type Ended =
  | { readonly kind: "returned"; readonly returned: unknown }
  | { readonly kind: "abnormal termination"; readonly error: unknown };

/** What an attempt lends its step's `run`: its handles and its services. */
interface Lent {
  readonly handles: Handles;
  readonly services: ReadonlyMap<string, unknown>;
}

function lending(
  journey: Journey,
  step: Buildable,
  { handles, services }: Lent,
  request: Request,
): unknown {
  if (request.kind === "contributor") {
    return handles.contributor;
  }
  if (request.kind === "stepReporter") {
    return handles.reporter;
  }
  if (request.kind === "service" && services.has(request.key)) {
    return services.get(request.key);
  }
  throw notLent(journey, step, request);
}

function notLent(
  journey: Journey,
  step: Buildable,
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

function notAnOutcome(step: Buildable, returned: unknown): string {
  return `step ${step.name} returned ${whatIs(returned)}, not an outcome made with its helpers`;
}
