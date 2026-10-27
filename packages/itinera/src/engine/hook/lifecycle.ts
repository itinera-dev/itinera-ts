import type { HookSource, StepHookSource } from "../../event.js";
import { AbortReason } from "../../journey.js";
import { type FailWorkflow, type Lifecycle, StepHook } from "../../policy.js";
import { finished, hasDetailsRefused } from "../../policy/lifecycle.js";
import { type GivenReason, reasonOf } from "../../step/outcome.js";
import { blamed } from "../handles/holder.js";
import type { Journey } from "../journey.js";
import { whatIs } from "../returned.js";
import { JourneyAbortError } from "../signal.js";

/**
 * The lifecycle `returned`, what the hook `hook` returned, once checked:
 * none for a workflow hook, which is void, so what it returned is never
 * read, or for a step hook that kept the default, and otherwise a lifecycle
 * the hook may return, its reason's details captured. Only
 * `on step success` may finish the workflow.
 *
 * @throws JourneyAbortError, aborting the journey with `invalid lifecycle`
 * when a failure hook finished the workflow, with `not a value` when the
 * details of the reason it failed the workflow with are not a value, or
 * with `unexpected result` when it returned anything else.
 */
export function lifecycleOf(
  journey: Journey,
  hook: HookSource,
  returned: unknown,
): Lifecycle | undefined {
  if (hook.kind === "workflow hook") {
    return undefined;
  }
  if (!isObject(returned)) {
    throw unexpected(journey, hook, returned);
  }
  try {
    return checked(journey, hook, returned);
  } catch (thrown) {
    throw thrown instanceof JourneyAbortError
      ? thrown
      : unexpected(journey, hook, returned);
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
  if (kind === "FinishWorkflow") {
    if (hook.hook !== StepHook.OnStepSuccess) {
      throw invalid(journey, hook);
    }
    return finished;
  }
  if (kind !== "FailWorkflow") {
    throw unexpected(journey, hook, returned);
  }
  const reason: unknown = Reflect.get(returned, "reason");
  if (!isGivenReason(reason)) {
    throw unexpected(journey, hook, returned);
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

function unexpected(
  journey: Journey,
  hook: StepHookSource,
  returned: unknown,
): JourneyAbortError {
  return journey.abort({
    reason: AbortReason.UnexpectedResult,
    step: hook.step,
    source: { kind: "step hook", policy: hook.policy, hook: hook.hook },
    message: `the hook ${hook.hook} of policy ${hook.policy} returned ${whatIs(returned)}, not keepDefault() or a lifecycle`,
  });
}

function invalid(journey: Journey, hook: StepHookSource): JourneyAbortError {
  return journey.abort({
    reason: AbortReason.InvalidLifecycle,
    step: hook.step,
  });
}

function notAValue(journey: Journey, hook: StepHookSource): JourneyAbortError {
  return journey.abort({ reason: AbortReason.NotAValue, ...blamed(hook) });
}
