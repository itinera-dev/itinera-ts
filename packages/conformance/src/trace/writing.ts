import type {
  AdapterSource,
  ByAdapter,
  ByAdapterForKey,
  ByProvider,
  ByRescueStep,
  ByStep,
  ByStepHook,
  ByWorkflowHook,
  DecidedBy,
  JourneyAbort,
  MissingData,
  ProviderSource,
  StepHookSource,
  StepSource,
} from "itinera/event";
import type { Reason } from "itinera/step";
import type { PlainValue } from "itinera/value";

import type { Column, Data } from "./line.js";

/** Anything an event names as who did or requested something. */
type Named =
  | ByStep
  | ByRescueStep
  | ByAdapter
  | ByAdapterForKey
  | ByStepHook
  | ByWorkflowHook
  | ByProvider
  | StepSource
  | AdapterSource
  | StepHookSource
  | ProviderSource;

/** Builds the line of one event, cell by cell. */
export class Writing {
  readonly cells = new Map<Column, string>();
  data: Data = { kind: "none" };
  readonly carried: PlainValue[] = [];

  set(column: Column, cell: string | number | undefined): void {
    if (cell !== undefined) {
      this.cells.set(column, String(cell));
    }
  }

  attempt(event: {
    readonly step: string;
    readonly attempt: { readonly number: number };
  }): void {
    this.set("step", event.step);
    this.set("attempt", event.attempt.number);
  }

  named(named: Named): void {
    if ("attempt" in named) {
      this.attempt(named);
    }
    switch (named.kind) {
      case "step hook":
      case "workflow hook":
        this.set("policy", named.policy);
        this.set("hook", named.hook);
        return;
      case "adapter":
        this.set("adapter", named.adapter);
        this.set("key", "key" in named ? named.key : undefined);
        return;
      case "provider":
        this.set("provider", named.provider);
        return;
      case "step":
      case "rescue step":
        return;
    }
  }

  source(
    named: StepSource | StepHookSource | ByWorkflowHook | ProviderSource,
  ): void {
    this.named(named);
    switch (named.kind) {
      case "step":
        this.set("source", named.step);
        return;
      case "step hook":
      case "workflow hook":
        this.set("source", `${named.policy}, ${named.hook}`);
        return;
      case "provider":
        return;
    }
  }

  reason(reason: Reason | undefined): void {
    if (reason !== undefined) {
      this.set("code", reason.code);
      this.carried.push(...[reason.message, reason.details].filter(isCarried));
    }
  }

  decidedBy(decidedBy: DecidedBy): void {
    this.set(
      "decided by",
      decidedBy === "default"
        ? decidedBy
        : `${decidedBy.policy}, ${decidedBy.hook}`,
    );
  }

  emitted(message: string, data: PlainValue | undefined): void {
    this.set("message", message);
    this.data =
      data === undefined ? { kind: "none" } : { kind: "is", value: data };
  }

  abort(abort: JourneyAbort): void {
    this.set("code", abort.reason);
    this.set("step", abort.step);
    this.set("error", "errorMessage" in abort ? abort.errorMessage : undefined);
    if ("source" in abort) {
      this.named(abort.source);
    }
    if ("requester" in abort) {
      this.named(abort.requester);
    }
    if ("key" in abort) {
      this.set("key", abort.key);
    }
    if ("policy" in abort) {
      this.set("policy", abort.policy);
    }
    if ("missing" in abort) {
      this.missing(abort.missing);
    }
  }

  missing(missing: MissingData): void {
    this.set("key", missing.kind === "key" ? missing.key : missing.kind);
    this.named(missing.requester);
  }
}

function isCarried(carried: PlainValue | undefined): carried is PlainValue {
  return carried !== undefined;
}
