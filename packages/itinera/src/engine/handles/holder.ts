import type {
  ByStep,
  ByStepHook,
  ByWorkflowHook,
  ContributionSource,
} from "../../event.js";
import { EventKind } from "../../event/kind.js";
import type { StepName } from "../../step.js";
import type { PlainValue } from "../../value.js";
import type { EventBody } from "../emitter.js";

/**
 * Who handles are lent to, as the events they cause name them: a step,
 * during one of its attempts, or a hook, for one call.
 */
export type Holder = ContributionSource;

/** The level of an event emitted through a reporter handle. */
export type Level = "info" | "warning" | "error";

const stepKinds = {
  info: EventKind.StepInfo,
  warning: EventKind.StepWarning,
  error: EventKind.StepError,
} as const;

const hookKinds = {
  info: EventKind.JourneyInfo,
  warning: EventKind.JourneyWarning,
  error: EventKind.JourneyError,
} as const;

/** The kind of the event `holder` emits at `level`. */
export function emittedKind(
  holder: Holder,
  level: Level,
): (typeof stepKinds)[Level] | (typeof hookKinds)[Level] {
  return holder.kind === "step" ? stepKinds[level] : hookKinds[level];
}

/**
 * The event `holder` emits at `level`, with `message` and, when it gave
 * some, `data`, already captured.
 */
export function emitted(
  holder: Holder,
  level: Level,
  message: string,
  data: PlainValue | undefined,
): EventBody {
  const carried = data === undefined ? {} : { data };
  if (holder.kind === "step") {
    const { step, attempt } = holder;
    return { kind: stepKinds[level], step, attempt, message, ...carried };
  }
  return { kind: hookKinds[level], source: holder, message, ...carried };
}

/**
 * What an abort caused through `holder`'s handles names of who caused it:
 * the step, or the step a step hook acts on, and the hook; a step names
 * only itself, and a workflow hook acts on no step.
 */
export function blamed(holder: Holder): Blamed {
  switch (holder.kind) {
    case "step":
      return { step: holder.step };
    case "step hook":
      return {
        step: holder.step,
        source: { kind: "step hook", policy: holder.policy, hook: holder.hook },
      };
    case "workflow hook":
      return { source: holder };
  }
}

/**
 * The step an abort caused through `holder`'s handles, or by the hook
 * itself, names: the step, or the step a step hook acts on; none for a
 * workflow hook.
 */
export function actedOn(holder: Holder): { readonly step?: StepName } {
  return holder.kind === "workflow hook" ? {} : { step: holder.step };
}

/** Who an abort names as having caused it. */
interface Blamed {
  /** The step, if one is concerned. */
  readonly step?: StepName;
  /** The hook, when a hook caused it. */
  readonly source?: ByStepHook | ByWorkflowHook;
}

/**
 * Who an abort for setting the reserved key of global metadata through
 * `holder`'s handles names as having set it.
 */
export function setter(holder: Holder): ByStep | ByStepHook | ByWorkflowHook {
  return blamed(holder).source ?? { kind: "step" };
}

/** `holder`, as a message about a handle used too late names it. */
export function described(holder: Holder): string {
  switch (holder.kind) {
    case "step":
      return `attempt ${holder.attempt.toString()} of step ${holder.step}`;
    case "step hook":
      return `${holder.hook} of policy ${holder.policy}, for attempt ${holder.attempt.toString()} of step ${holder.step}`;
    case "workflow hook":
      return `${holder.hook} of policy ${holder.policy}`;
  }
}
