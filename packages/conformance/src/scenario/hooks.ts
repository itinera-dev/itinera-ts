/**
 * What a scenario's hook does before it ends, as the runner plays it
 * through the handles and the answers itinera gives the hook.
 */
import type { Contributor, HookReporter, StepReporter } from "itinera/unstable";
import { given } from "../given.js";
import { ModelError } from "../model/error.js";
import type { HookAction, HookRequest, HookScript } from "../model/policy.js";
import { isPerformer } from "../roles.js";
import { changeInPlace } from "./actions.js";

/** A step's contributor and step reporter, kept after its attempt ended. */
export interface Kept {
  readonly contributor: Contributor;
  readonly reporter: StepReporter;
}

/** One call of a scripted hook: what it was lent and answered, and what it may reach. */
interface HookActing {
  /** The hook's contributor. */
  readonly contributor: Contributor;
  /** The hook's reporter. */
  readonly reporter: HookReporter;
  /** What its scripted requests were answered with, in order. */
  readonly answers: readonly unknown[];
  /** How many calls of the policy's hooks its instance has seen, this one included. */
  readonly count: number;
  /** The handles a step kept after its last attempt, if it kept any. */
  readonly kept: (step: string) => Kept | undefined;
}

/**
 * Plays what the hook's script does before it ends: its actions, in the
 * order written, awaiting each call on the hook reporter.
 *
 * @throws Error when a role operation it calls throws, as the scenario
 * scripts it.
 */
export async function hookActed(
  script: HookScript,
  acting: HookActing,
): Promise<void> {
  for (const action of script.actions) {
    await acted(script, action, acting);
  }
}

async function acted(
  script: HookScript,
  action: HookAction,
  { contributor, reporter, answers, count, kept }: HookActing,
): Promise<void> {
  switch (action.kind) {
    case "contribute":
      contributor.contribute(action.key, given(action.value));
      return;
    case "count calls":
      contributor.contribute(action.key, count);
      return;
    case "change step data":
      changeInPlace(
        answers[script.requests.findIndex(stepDataUnder(action.key))],
        given(action.value),
      );
      return;
    case "emit":
      await reporter[action.level](action.message);
      return;
    case "set global metadata":
      await reporter.setGlobalMetadata(action.key, given(action.value));
      return;
    case "call role": {
      const performer =
        answers[script.requests.findIndex(roleNamed(action.role))];
      if (!isPerformer(performer)) {
        throw new ModelError(
          `the hook never requests the role "${action.role}"`,
        );
      }
      performer.perform(action.role, action.operation);
      return;
    }
    case "use kept handles":
      await usedLate(kept(action.step), action);
  }
}

/**
 * Uses the handles a step kept, as the hook's script says, ignoring that
 * each refuses the call, since a late call changes nothing whatever it does.
 */
async function usedLate(
  handles: Kept | undefined,
  action: Extract<HookAction, { readonly kind: "use kept handles" }>,
): Promise<void> {
  if (handles === undefined) {
    throw new ModelError(`step "${action.step}" kept no handles`);
  }
  try {
    handles.contributor.contribute(action.key, given(action.value));
  } catch {
    // A contributor used after its attempt refuses the call.
  }
  try {
    await handles.reporter.info(action.message);
  } catch {
    // A step reporter used after its attempt refuses the call.
  }
}

function stepDataUnder(key: string): (request: HookRequest) => boolean {
  return (request) => isStepDataUnder(request, key);
}

function isStepDataUnder(request: HookRequest, key: string): boolean {
  return request.kind === "step data" && request.key === key;
}

function roleNamed(role: string): (request: HookRequest) => boolean {
  return (request) => isRoleNamed(request, role);
}

function isRoleNamed(request: HookRequest, role: string): boolean {
  return request.kind === "role" && request.role === role;
}
