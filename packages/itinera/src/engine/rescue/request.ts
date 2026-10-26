import type {
  Data,
  FailureRequest,
  Request,
} from "../../declaration/request.js";
import type { Attempt, StepName } from "../../step.js";
import type { Left } from "../hook.js";
import type { Journey } from "../journey.js";
import { ownCopy } from "../own-copy.js";
import {
  byStep,
  failureAnswered,
  type FailureRequesting,
  requested,
} from "../request.js";

/**
 * A request a rescue step makes of the step it rescues: a contribution of its
 * failed attempt, its failure's reason, or its error.
 */
type OfRescued = (Data & { readonly kind: "fromRescuedStep" }) | FailureRequest;

/** Whether `request` is one a rescue step makes of the step it rescues. */
export function isOfRescued(request: Request): request is OfRescued {
  return (
    request.kind === "fromRescuedStep" ||
    request.kind === "failureReason" ||
    request.kind === "error"
  );
}

/**
 * What the rescue step `rescue`, built for `attempt`, receives for its
 * request of the step it rescues, from what that step's failed attempt
 * `left`: a contribution, read as an input is but from what the attempt
 * contributed, or its own copy of the failure's reason or the error, or for
 * an optional request `Some` of it, or `None` when there is none.
 *
 * @throws JourneyAbortError, aborting the journey as a request for a value
 * does, or with `required data missing` when a required request for the
 * failure's reason or the error finds none.
 */
export async function fromRescued(
  journey: Journey,
  rescue: StepName,
  attempt: Attempt,
  left: Left,
  request: OfRescued,
): Promise<unknown> {
  const requesting: FailureRequesting = {
    step: rescue,
    requester: { kind: "rescue step" },
  };
  switch (request.kind) {
    case "fromRescuedStep":
      return requested(
        journey,
        byStep(rescue, attempt),
        request.key,
        request.type,
        left.contributed.get(request.key),
      );
    case "failureReason":
      return failureAnswered(
        journey,
        requesting,
        request,
        left.reason.map(structuredClone),
      );
    case "error":
      return failureAnswered(
        journey,
        requesting,
        request,
        left.error.map(ownCopy),
      );
  }
}
