import type { HookSource, StepHookSource } from "../../event.js";
import { AbortReason } from "../../journey.js";
import { type FailWorkflow, type Lifecycle, StepHook } from "../../policy.js";
import { finished, hasDetailsRefused } from "../../policy/lifecycle.js";
import { type GivenReason, reasonOf } from "../../step/outcome.js";
import { actedOn, blamed } from "../handles/holder.js";
import type { Journey } from "../journey.js";
import { JourneyAbortError } from "../signal.js";

/**
 * The lifecycle `returned`, what the hook `hook` returned, once checked:
 * none when it returned nothing, or a step hook kept the default, and
 * otherwise a lifecycle the hook may return, its reason's details captured.
 * Only `on step success` may finish the workflow, and a workflow hook
 * returns nothing.
 *
 * @throws JourneyAbortError, aborting the journey with `invalid lifecycle`
 * when the hook returned anything else, or with `not a value` when the
 * details of the reason it failed the workflow with are not a value.
 */
export function lifecycleOf(
  journey: Journey,
  hook: HookSource,
  returned: unknown,
): Lifecycle | undefined {
  if (returned === undefined) {
    return undefined;
  }
  if (hook.kind === "workflow hook" || !isObject(returned)) {
    throw invalid(journey, hook);
  }
  try {
    return checked(journey, hook, returned);
  } catch (thrown) {
    throw thrown instanceof JourneyAbortError ? thrown : invalid(journey, hook);
  }
}

function checked(
  journey: Journey,
  hook: StepHookSource,
  returned: object,
): Lifecycle | undefined {
  const kind: unknown = Reflect.get(returned, "kind");
  if (kind === "KeepDefault") {
    return undefined;
  }
  if (kind === "FinishWorkflow" && hook.hook === StepHook.OnStepSuccess) {
    return finished;
  }
  if (kind !== "FailWorkflow") {
    throw invalid(journey, hook);
  }
  const reason: unknown = Reflect.get(returned, "reason");
  if (!isGivenReason(reason)) {
    throw invalid(journey, hook);
  }
  const captured = reasonOf(reason);
  if (captured.refused || hasDetailsRefused(returned)) {
    throw notAValue(journey, hook);
  }
  const failing: FailWorkflow = Object.freeze({
    kind: "FailWorkflow",
    reason: captured.reason,
  });
  return failing;
}

function isObject(returned: unknown): returned is object {
  return typeof returned === "object" && returned !== null;
}

function isGivenReason(reason: unknown): reason is GivenReason<unknown> {
  if (!isObject(reason)) {
    return false;
  }
  const message: unknown = Reflect.get(reason, "message");
  return (
    typeof Reflect.get(reason, "code") === "string" &&
    (message === undefined || typeof message === "string")
  );
}

function invalid(journey: Journey, hook: HookSource): JourneyAbortError {
  return journey.abort({
    reason: AbortReason.InvalidLifecycle,
    ...actedOn(hook),
  });
}

function notAValue(journey: Journey, hook: StepHookSource): JourneyAbortError {
  return journey.abort({ reason: AbortReason.NotAValue, ...blamed(hook) });
}
