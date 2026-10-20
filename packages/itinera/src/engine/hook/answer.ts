import type { Request } from "../../declaration/request.js";
import type { StepHookSource } from "../../event.js";
import { AbortReason } from "../../journey.js";
import type { Handles } from "../handles.js";
import { actedOn } from "../handles/holder.js";
import type { Calling, Left } from "../hook.js";
import { messageOf } from "../message.js";
import { ownCopy } from "../own-copy.js";
import {
  byHook,
  failureAnswered,
  type FailureRequesting,
  requested,
} from "../request.js";
import type { JourneyAbortError } from "../signal.js";

/**
 * What the hook's request `request` is answered with: a value from the data
 * bag or from the attempt, as the requester's own copy, the journey ID, the
 * workflow object as a role, one of the hook's handles, or what the attempt
 * left.
 *
 * @throws JourneyAbortError, aborting the journey as a request for a value
 * does, with `required data missing` when a required request for the
 * failure's reason or the error finds none, or with `hook failed` for a
 * request itinera does not answer for this hook.
 */
export async function answered(
  calling: Calling,
  handles: Handles,
  request: Request,
): Promise<unknown> {
  const { journey, instance, hook } = calling;
  switch (request.kind) {
    case "fromWorkflow":
      return requested(
        journey,
        byHook(hook),
        request.key,
        request.type,
        journey.data.get(request.key),
      );
    case "journeyId":
      return instance.journeyId;
    case "role":
      return instance.workflow;
    case "contributor":
      return handles.contributor;
    case "hookReporter":
      return handles.reporter;
    case "fromStep": {
      const { left } = ofStepHook(calling, request);
      return requested(
        journey,
        byHook(hook),
        request.key,
        request.type,
        left.contributed.get(request.key),
      );
    }
    case "failureReason": {
      const of = ofStepHook(calling, request);
      return failureAnswered(
        journey,
        stepHookOf(of.hook),
        request,
        of.left.reason.map(structuredClone),
      );
    }
    case "error": {
      const of = ofStepHook(calling, request);
      return failureAnswered(
        journey,
        stepHookOf(of.hook),
        request,
        of.left.error.map(ownCopy),
      );
    }
    case "failureCause":
    case "retryCause": {
      const { cause } = ofStepHook(calling, request).left;
      if (cause.isNone()) {
        throw notAnswered(calling, request);
      }
      return cause.value;
    }
    case "stepName":
      return ofStepHook(calling, request).hook.step;
    case "attempt":
      return ofStepHook(calling, request).hook.attempt;
    case "dataBag":
    case "fromRescuedStep":
    case "input":
    case "key":
    case "providerReporter":
    case "service":
    case "stepReporter":
      throw notAnswered(calling, request);
  }
}

/** A step hook's call, with what the attempt left. */
interface OfStepHook {
  readonly hook: StepHookSource;
  readonly left: Left;
}

/**
 * The step hook `calling` calls, with what the attempt left, for a request
 * only a step hook is answered.
 *
 * @throws JourneyAbortError, aborting the journey with `hook failed` when it
 * calls a workflow hook.
 */
function ofStepHook(calling: Calling, request: Request): OfStepHook {
  if (!("left" in calling)) {
    throw notAnswered(calling, request);
  }
  return calling;
}

/** The step hook, requesting what the attempt of the step it acts on left. */
function stepHookOf({ policy, hook, step }: StepHookSource): FailureRequesting {
  return { step, requester: { kind: "step hook", policy, hook } };
}

function notAnswered(
  { journey, hook }: Calling,
  request: Request,
): JourneyAbortError {
  const error = new TypeError(
    `${hook.hook} of policy ${hook.policy} requests @${request.kind}, which itinera does not give a ${hook.kind}`,
  );
  return journey.abort({
    reason: AbortReason.HookFailed,
    ...actedOn(hook),
    errorMessage: messageOf(error),
    error,
  });
}
