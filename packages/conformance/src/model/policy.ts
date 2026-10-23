import { StepHook, WorkflowHook } from "itinera/policy";
import { ModelError } from "./error.js";
import type { Level } from "./step.js";
import type { Scripted, CaseType } from "./value.js";

/** A hook of either kind, by the name the cases give it. */
export type Hook = StepHook | WorkflowHook;

/** Whether a policy is a step policy or a workflow policy. */
export type PolicyKind = "step" | "workflow";

/** A scripted policy: its kind, its hooks in the order defined, and how building it fails. */
export interface PolicyScript {
  readonly kind: PolicyKind;
  /** Each hook it defines, with its script, in the order defined. */
  readonly hooks: Map<Hook, HookScript>;
  /**
   * Whether building an instance of it fails: with the message given, or
   * with one of the runner's own when the case gives none.
   */
  buildFailure?: string;
}

/** What a hook requests, what it does, and how it ends. */
export interface HookScript {
  /** Its requests, in the order written. */
  readonly requests: HookRequest[];
  /** What it does before it ends, in the order written. */
  readonly actions: HookAction[];
  /** How it ends: keeping the default until a sentence says otherwise. */
  ending: HookReturn;
}

/** One request of a hook. */
export type HookRequest =
  | {
      readonly kind: "step data" | "data from the workflow";
      readonly key: string;
      readonly type: CaseType;
      readonly optional: boolean;
    }
  | { readonly kind: "failure reason"; readonly optional: boolean }
  | {
      readonly kind:
        | "attempt number"
        | "error"
        | "failure cause"
        | "journey ID"
        | "retry cause"
        | "step name";
    }
  | { readonly kind: "role"; readonly role: string };

/** Something a hook does before it ends. */
export type HookAction =
  | {
      readonly kind: "contribute" | "change step data" | "set global metadata";
      readonly key: string;
      readonly value: Scripted;
    }
  | { readonly kind: "count calls"; readonly key: string }
  | { readonly kind: "emit"; readonly level: Level; readonly message: string }
  | {
      readonly kind: "call role";
      readonly role: string;
      readonly operation: string;
    }
  | {
      readonly kind: "use kept handles";
      readonly step: string;
      readonly key: string;
      readonly value: Scripted;
      readonly message: string;
    };

/** How a hook ends. */
export type HookReturn =
  | { readonly kind: "keep default" | "finish workflow" }
  | { readonly kind: "fail workflow"; readonly code: string }
  | { readonly kind: "fail"; readonly message?: string };

/** A role the workflow provides: its operations, and those that throw when called. */
export interface Role {
  readonly operations: Set<string>;
  readonly failing: Set<string>;
}

/**
 * The hook of the kind of policy named so, as a sentence names it.
 *
 * @throws ModelError when no hook of that kind has the name.
 */
export function hookNamed(kind: PolicyKind, name: string): Hook {
  const hooks = kind === "step" ? StepHook : WorkflowHook;
  if (!hooks.has(name)) {
    throw new ModelError(`"${name}" is not a hook of a ${kind} policy`);
  }
  return name;
}

/** A hook that requests nothing, does nothing and keeps the default. */
export function unscriptedHook(): HookScript {
  return { requests: [], actions: [], ending: { kind: "keep default" } };
}
