import type { ByWorkflowHook, HookSource, StepHookSource } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { WorkflowInstance } from "../instance.js";
import { AbortReason } from "../journey.js";
import type { Option } from "../option.js";
import type { Lifecycle, RetryCause, StepFailureCause } from "../policy.js";
import { hookOf } from "../policy/descriptor.js";
import type { Reason } from "../step.js";
import type { PlainValue } from "../value.js";
import { committed } from "./commit.js";
import { Handles } from "./handles.js";
import { actedOn } from "./handles/holder.js";
import { answered } from "./hook/answer.js";
import { lifecycleOf } from "./hook/lifecycle.js";
import type { EventBody } from "./emitter.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { inOrder } from "./order.js";
import type { BuiltPolicy } from "./policies.js";
import { JourneyAbortError } from "./signal.js";

/**
 * What an attempt left for the step hooks called after it to request, besides
 * the step and the attempt their events name.
 */
export interface Left {
  /**
   * What the attempt contributed, committed or not: nothing after an
   * abnormal termination.
   */
  readonly contributed: ReadonlyMap<string, PlainValue>;
  /** The reason the attempt reported, when it reported a failure. */
  readonly reason: Option<Reason>;
  /** The error that ended it, when it ended in an abnormal termination. */
  readonly error: Option<unknown>;
  /** Why the hook is called, for `on step failure` and `on step retry`. */
  readonly cause: Option<StepFailureCause | RetryCause>;
}

/**
 * One call of a hook: the journey and its instance, the policy built that
 * defines the hook, the hook as its events name it, and, for a step hook,
 * what the attempt left.
 */
export type Calling = StepHookCalling | WorkflowHookCalling;

/** One call of a step hook, with what the attempt left. */
interface StepHookCalling {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly built: BuiltPolicy;
  readonly hook: StepHookSource;
  readonly left: Left;
}

/** One call of a workflow hook, which no attempt left anything for. */
interface WorkflowHookCalling {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly built: BuiltPolicy;
  readonly hook: ByWorkflowHook;
}

/**
 * Calls a hook: resolves its requests in the order it declares them, calls
 * it with what they were answered with, lending it the handles it requests,
 * and closes them once it and every call it made on them have settled. Once
 * it returned without failing, checks what it returned, reports it with
 * `hook_called`, and commits what it contributed. Gives the lifecycle it
 * returned; none when it kept the default.
 *
 * @throws JourneyAbortError when resolving a request aborts the journey,
 * when the journey was aborted while the hook ran, whatever it did
 * afterwards, with `hook failed` when it failed, or as
 * {@link lifecycleOf} says for what it returned.
 */
export async function hookCalled(
  calling: Calling,
): Promise<Lifecycle | undefined> {
  const { journey, built, hook } = calling;
  const handles = new Handles(journey, hook);
  const requests = hookOf(built.descriptor, hook.hook)?.requests ?? [];
  const answers = await inOrder(requests, (request) =>
    answered(calling, handles, request),
  );
  const returned = await guarded(calling, handles, answers);
  const lifecycle = lifecycleOf(journey, hook, returned);
  await journey.emit(reported(hook, lifecycle));
  await committed(journey, hook, handles.contributed);
  return lifecycle;
}

/** How a hook's call ended: what it returned, or what it threw. */
type Ended =
  | { readonly kind: "returned"; readonly returned: unknown }
  | { readonly kind: "threw"; readonly error: unknown };

/**
 * Calls the hook through the executor's wrapper: once its handles are
 * closed, an abort recorded while it ran stands, whatever the hook did, and
 * a hook that failed otherwise aborts the journey with `hook failed`.
 */
async function guarded(
  { journey, built, hook }: Calling,
  handles: Handles,
  answers: readonly unknown[],
): Promise<unknown> {
  let ended: Ended;
  try {
    const returned: unknown = await built.descriptor.call(
      built.policy,
      hook.hook,
      answers,
    );
    ended = { kind: "returned", returned };
  } catch (error) {
    ended = { kind: "threw", error };
  }
  await handles.closed();
  const { recorded } = journey;
  if (recorded !== undefined) {
    throw new JourneyAbortError(recorded);
  }
  if (ended.kind === "returned") {
    return ended.returned;
  }
  const { error } = ended;
  throw error instanceof JourneyAbortError
    ? journey.abort(error.abort)
    : journey.abort({
        reason: AbortReason.HookFailed,
        ...actedOn(hook),
        errorMessage: messageOf(error),
        error,
      });
}

function reported(
  hook: HookSource,
  lifecycle: Lifecycle | undefined,
): EventBody {
  if (hook.kind === "workflow hook") {
    return { kind: EventKind.HookCalled, source: hook };
  }
  return lifecycle === undefined
    ? { kind: EventKind.HookCalled, source: hook }
    : { kind: EventKind.HookCalled, source: hook, lifecycle };
}
