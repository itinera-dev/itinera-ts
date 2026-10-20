import type { Request } from "../../declaration/request.js";
import type { StepDescriptor, StepName } from "../../step.js";
import type { StepRequests } from "../../step/declared.js";
import { requestsOfDescribed, rescueOf } from "../../step/descriptor.js";
import type { PlainValue } from "../../value.js";
import type { Level } from "../emitted.js";
import type { Ending } from "../ending.js";

/** What a scripted attempt does before it ends, in the order written. */
export type Action =
  | {
      readonly kind: "contribute";
      readonly key: string;
      readonly value: PlainValue;
    }
  | {
      readonly kind: "emit";
      readonly level: Level;
      readonly message: string;
      readonly data: PlainValue | undefined;
    }
  | {
      readonly kind: "set global metadata";
      readonly key: string;
      readonly value: PlainValue;
    };

/**
 * What the script says of one attempt: the real step runs, or the attempt
 * plays its actions, then ends.
 */
export type Described = { readonly kind: "real run" } | Played;

/** An attempt that plays its actions, in order, then ends. */
export interface Played {
  readonly kind: "played";
  readonly actions: readonly Action[];
  readonly ending: Ending;
}

/** What the workflow says of a scripted step's attempts. */
export type Kind =
  | {
      readonly kind: "step";
      /** How many attempts its retry budget allows. */
      readonly attempts: number;
      /** Whether an abnormal termination is retried, within that budget. */
      readonly retryOnAbnormalTermination: boolean;
      /** Its rescue step's name, if it has one. */
      readonly rescue: StepName | undefined;
    }
  | { readonly kind: "rescue" };

/**
 * A step, or a rescue step, the script names, with what the workflow says of
 * it and what the script says of its attempts so far.
 */
export class Target {
  /** What each attempt numbered so far does, attempt 1 first. */
  readonly numbered: Described[] = [];
  /** What every attempt after the numbered ones does, once described. */
  rest: Described | undefined;
  /** Whether its `run` declares a contributor. */
  readonly contributes: boolean;
  /** Whether its `run` declares a step reporter. */
  readonly reports: boolean;

  constructor(
    readonly name: StepName,
    readonly kind: Kind,
    requests: StepRequests,
  ) {
    this.contributes = requests.run.some(isContributor);
    this.reports = requests.run.some(isStepReporter);
  }

  /**
   * How many attempts it can have: one for a rescue step, two for a step
   * with a rescue step, the attempt before the rescue and the one after, and
   * otherwise as many as its retry budget allows.
   */
  get mostAttempts(): number {
    switch (this.kind.kind) {
      case "rescue":
        return 1;
      case "step":
        return this.kind.rescue === undefined ? this.kind.attempts : 2;
    }
  }

  /** What the script says attempt `number` does, if it says. */
  described(number: number): Described | undefined {
    return this.numbered[number - 1] ?? this.rest;
  }
}

/** The step, or the rescue step, of `steps` named `name`, as a target. */
export function targetNamed(
  steps: readonly StepDescriptor[],
  name: string,
): Target | undefined {
  return steps.flatMap(targetsOf).find(namedAs(name));
}

/** The name of every step and rescue step of `steps`, in order. */
export function everyName(
  steps: readonly StepDescriptor[],
): readonly StepName[] {
  return steps.flatMap(targetsOf).map(nameOf);
}

/** Whether a target is named `name`. */
export function namedAs(name: string): (target: Target) => boolean {
  return (target) => target.name === name;
}

function targetsOf(step: StepDescriptor): readonly Target[] {
  const rescue = rescueOf(step);
  const own = new Target(
    step.name,
    {
      kind: "step",
      attempts: step.retryBudget + 1,
      retryOnAbnormalTermination: step.retryOnAbnormalTermination,
      rescue: rescue?.name,
    },
    requestsOfDescribed(step),
  );
  return rescue === undefined
    ? [own]
    : [own, new Target(rescue.name, { kind: "rescue" }, rescue.requests)];
}

function nameOf(target: Target): StepName {
  return target.name;
}

function isContributor(request: Request): boolean {
  return request.kind === "contributor";
}

function isStepReporter(request: Request): boolean {
  return request.kind === "stepReporter";
}
