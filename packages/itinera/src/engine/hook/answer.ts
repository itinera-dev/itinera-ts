import type { FailureRequest, Request } from "../../declaration/request.js";
import type { StepHookSource } from "../../event.js";
import { AbortReason } from "../../journey.js";
import { None, type Option } from "../../option.js";
import type { Handles } from "../handles.js";
import { actedOn } from "../handles/holder.js";
import type { Calling, Left } from "../hook.js";
import type { Journey } from "../journey.js";
import { messageOf } from "../message.js";
import { byHook, requested } from "../request.js";
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
      return failureAnswer(
        journey,
        of.hook,
        request,
        of.left.reason.map(structuredClone),
      );
    }
    case "error": {
      const of = ofStepHook(calling, request);
      return failureAnswer(
        journey,
        of.hook,
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

/**
 * What a request for the failure's reason or the error receives: it, or for
 * an optional request `Some` of it, or `None` when the attempt left none.
 *
 * @throws JourneyAbortError, aborting the journey with `required data
 * missing` when a required request finds none.
 */
function failureAnswer(
  journey: Journey,
  { policy, hook, step }: StepHookSource,
  request: FailureRequest,
  found: Option<unknown>,
): unknown {
  if (found.isSome()) {
    return request.optional ? found : found.value;
  }
  if (request.optional) {
    return None;
  }
  throw journey.abort({
    reason: AbortReason.RequiredDataMissing,
    step,
    missing: {
      kind: request.kind === "failureReason" ? "failure reason" : "error",
      requester: { kind: "step hook", policy, hook },
    },
  });
}

/**
 * The error as the hook's own copy, so that what the hook changes on it
 * reaches no one else, or the error itself when it cannot be copied, as a
 * proxy whose traps throw cannot. A thrown value that is not an object is
 * given as it is.
 */
function ownCopy(error: unknown): unknown {
  if (typeof error !== "object" || error === null) {
    return error;
  }
  try {
    return copyOf(error);
  } catch {
    return error;
  }
}

/**
 * An object with the prototype and the own properties of `error`, made as an
 * `Error` when it is one, so that `instanceof`, its message, its stack and its
 * cause hold. Its getters are copied, not called, so one that throws does so
 * only when the hook reads it. The stack is copied as its value, since the
 * runtime's own accessor would read the copy's.
 */
function copyOf(error: object): object {
  const copy: object = error instanceof Error ? new Error() : {};
  Reflect.setPrototypeOf(copy, Reflect.getPrototypeOf(error));
  Object.defineProperties(copy, Object.getOwnPropertyDescriptors(error));
  if (error instanceof Error && Object.hasOwn(error, "stack")) {
    Object.defineProperty(copy, "stack", {
      value: error.stack,
      writable: true,
      configurable: true,
    });
  }
  return copy;
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
