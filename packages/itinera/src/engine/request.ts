import type {
  FailureRequester,
  HookSource,
  Requester,
  RequestSource,
} from "../event.js";
import { EventKind } from "../event/kind.js";
import type { Checked, FailureRequest } from "../declaration/request.js";
import { AbortReason } from "../journey.js";
import { None, type Option } from "../option.js";
import type { ProviderName } from "../service.js";
import type { Attempt, StepName } from "../step.js";
import type { PlainValue } from "../value.js";
import { received } from "../value/read.js";
import type { AdapterName } from "../workflow.js";
import type { Journey } from "./journey.js";

/**
 * Who makes a request for a value, as its abort and its events name it: the
 * step it is for, unless a workflow hook makes it, who requested it, and who
 * an `optional_input_absent` names.
 */
export interface Requesting {
  /** The step the request is for, unless a workflow hook makes it. */
  readonly step?: StepName;
  /** Who requested it, as an abort names them. */
  readonly requester: Requester;
  /** Who requested it, as `optional_input_absent` names them. */
  readonly source: RequestSource;
}

/** A step, requesting one of its inputs for `attempt`. */
export function byStep(step: StepName, attempt: Attempt): Requesting {
  return {
    step,
    requester: { kind: "step" },
    source: { kind: "step", step, attempt },
  };
}

/** The input adapter `adapter`, requesting for the step `step` and `attempt`. */
export function byAdapter(
  adapter: AdapterName,
  step: StepName,
  attempt: Attempt,
): Requesting {
  return {
    step,
    requester: { kind: "adapter", adapter },
    source: { kind: "adapter", adapter, step, attempt },
  };
}

/** The service provider `provider`, requesting for the step `step` and `attempt`. */
export function byProvider(
  provider: ProviderName,
  step: StepName,
  attempt: Attempt,
): Requesting {
  return {
    step,
    requester: { kind: "provider", provider },
    source: { kind: "provider", provider, step, attempt },
  };
}

/** The hook `hook`, requesting for its call. */
export function byHook(hook: HookSource): Requesting {
  if (hook.kind === "workflow hook") {
    return { requester: hook, source: hook };
  }
  const { policy, step } = hook;
  return {
    step,
    requester: { kind: "step hook", policy, hook: hook.hook },
    source: hook,
  };
}

/**
 * What a request for the value under `key`, of the type `type`, receives,
 * given `found`, the value under the key, if any: the value, as the
 * requester's own copy, or for an optional request `Some` of it, or `None`
 * when there is no value, which `optional_input_absent` reports.
 *
 * @throws JourneyAbortError, aborting the journey with `required data
 * missing` when a required request finds no value, or with `wrong type` when
 * the value is of another type.
 */
export async function requested(
  journey: Journey,
  requesting: Requesting,
  key: string,
  type: Checked,
  found: PlainValue | undefined,
): Promise<unknown> {
  if (found === undefined) {
    if (!type.optional) {
      throw journey.abort({
        reason: AbortReason.RequiredDataMissing,
        ...stepOf(requesting),
        missing: { kind: "key", key, requester: requesting.requester },
      });
    }
    await journey.emit({
      kind: EventKind.OptionalInputAbsent,
      key,
      requester: requesting.source,
    });
    return None;
  }
  const value = received(found, type.schema);
  if (value.isNone()) {
    throw journey.abort({
      reason: AbortReason.WrongType,
      ...stepOf(requesting),
      key,
      requester: requesting.requester,
    });
  }
  return type.optional ? value : value.value;
}

/** The step a request is for, as an abort names it, if there is one. */
function stepOf({ step }: Requesting): { readonly step?: StepName } {
  return step === undefined ? {} : { step };
}

/**
 * Who requests what a failed attempt left, the failure's reason or the error,
 * as its abort names them: the step the attempt was of, or the rescue step,
 * and who requested it.
 */
export interface FailureRequesting {
  /** The step the abort names. */
  readonly step: StepName;
  /** Who requested it. */
  readonly requester: FailureRequester;
}

/**
 * What a request for the failure's reason or the error receives, given
 * `found`, what the failed attempt left of it: it, or for an optional request
 * `Some` of it, or `None` when the attempt left none, with no event.
 *
 * @throws JourneyAbortError, aborting the journey with `required data
 * missing` when a required request finds none.
 */
export function failureAnswered(
  journey: Journey,
  { step, requester }: FailureRequesting,
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
      requester,
    },
  });
}
