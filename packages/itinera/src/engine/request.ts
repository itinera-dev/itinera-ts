import type { Requester, RequestSource } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { Checked } from "../declaration/request.js";
import { AbortReason } from "../journey.js";
import { None } from "../option.js";
import type { Attempt, StepName } from "../step.js";
import type { PlainValue } from "../value.js";
import { received } from "../value/read.js";
import type { AdapterName } from "../workflow.js";
import type { Journey } from "./journey.js";

/**
 * Who makes a request for a value, as its abort and its events name it: the
 * step it is for, who requested it, and who an `optional_input_absent`
 * names.
 */
export interface Requesting {
  /** The step the request is for. */
  readonly step: StepName;
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
        step: requesting.step,
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
      step: requesting.step,
      key,
      requester: requesting.requester,
    });
  }
  return type.optional ? value : value.value;
}
