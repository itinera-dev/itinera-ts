import type { StepDescriptor } from "../../step.js";
import { type Mistake, MistakeKind } from "../mistake.js";
import { type Described, namedAs, type Target } from "./target.js";

/**
 * Everything the script leaves out, in the order of the targets: for each
 * scripted step, the first attempt it can have that the script leaves out,
 * since those after it depend on how it ends, then its rescue step, when the
 * step can fail on attempt 1 and its rescue step is not scripted; and, when
 * `all` is set, every step of `steps` the script does not name.
 */
export function leftOut(
  targets: readonly Target[],
  steps: readonly StepDescriptor[],
  all: boolean,
): readonly Mistake[] {
  const required = all ? steps : [];
  return [
    ...targets.flatMap((target) => leftOutOf(targets, target)),
    ...required.filter(unscriptedIn(targets)).map(stepLeftOut),
  ];
}

function leftOutOf(
  targets: readonly Target[],
  target: Target,
): readonly Mistake[] {
  return [...firstUncovered(target), ...unscriptedRescue(targets, target)];
}

/** The first attempt the target can have that the script leaves out, if any. */
function firstUncovered(target: Target): readonly Mistake[] {
  const stop = attemptsOf(target).find(stopsAt(target));
  return stop !== undefined && target.described(stop) === undefined
    ? [{ kind: MistakeKind.AttemptLeftOut, step: target.name, attempt: stop }]
    : [];
}

/** The numbers of every attempt the target can have. */
function attemptsOf(target: Target): readonly number[] {
  return Array.from({ length: target.mostAttempts }, numberAt);
}

function numberAt(_: unknown, index: number): number {
  return index + 1;
}

/**
 * Whether no attempt can follow an attempt of the target, as the script
 * describes it, or because it does not.
 */
function stopsAt(target: Target): (attempt: number) => boolean {
  return (attempt) => {
    const described = target.described(attempt);
    return described === undefined || !continues(target, described, attempt);
  };
}

/** Whether the step may be attempted again after this attempt, budget aside. */
function continues(
  target: Target,
  described: Described,
  attempt: number,
): boolean {
  if (described.kind === "real run") {
    return true;
  }
  switch (described.ending.kind) {
    case "success":
    case "skipped":
      return false;
    case "failure":
      return true;
    case "abnormal termination":
      return (
        target.kind.kind === "step" &&
        ((attempt === 1 && target.kind.rescue !== undefined) ||
          target.kind.retryOnAbnormalTermination)
      );
  }
}

/**
 * The target's rescue step, when the target can fail on attempt 1 and the
 * script leaves its rescue step out.
 */
function unscriptedRescue(
  targets: readonly Target[],
  target: Target,
): readonly Mistake[] {
  if (target.kind.kind !== "step" || target.kind.rescue === undefined) {
    return [];
  }
  const first = target.described(1);
  const rescue = target.kind.rescue;
  return first !== undefined && canFail(first) && !targets.some(namedAs(rescue))
    ? [
        {
          kind: MistakeKind.RescueStepLeftOut,
          step: rescue,
          rescued: target.name,
        },
      ]
    : [];
}

function canFail(described: Described): boolean {
  return (
    described.kind === "real run" ||
    (described.ending.kind !== "success" && described.ending.kind !== "skipped")
  );
}

function unscriptedIn(
  targets: readonly Target[],
): (step: StepDescriptor) => boolean {
  return (step) => !targets.some(namedAs(step.name));
}

function stepLeftOut(step: StepDescriptor): Mistake {
  return { kind: MistakeKind.StepLeftOut, step: step.name };
}
