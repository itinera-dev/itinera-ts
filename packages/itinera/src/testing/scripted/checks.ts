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
  return [
    ...firstUncovered(target, rescueMaySucceed(targets, target)),
    ...unscriptedRescue(targets, target),
  ];
}

/** The first attempt the target can have that the script leaves out, if any. */
function firstUncovered(
  target: Target,
  rescueMaySucceed: boolean,
): readonly Mistake[] {
  const stop = attemptsOf(target).find(stopsAt(target, rescueMaySucceed));
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
function stopsAt(
  target: Target,
  rescueMaySucceed: boolean,
): (attempt: number) => boolean {
  return (attempt) => {
    const described = target.described(attempt);
    return (
      described === undefined ||
      !continues(target, described, attempt, rescueMaySucceed)
    );
  };
}

/**
 * Whether the step may be attempted again after this attempt, budget aside.
 * After a failed attempt 1 of a step with a rescue step, only a rescue step
 * that may succeed lets it run again, since a failed rescue ends the journey.
 */
function continues(
  target: Target,
  described: Described,
  attempt: number,
  rescueMaySucceed: boolean,
): boolean {
  if (described.kind === "real run") {
    return true;
  }
  const rescuedFirst =
    attempt === 1 &&
    target.kind.kind === "step" &&
    target.kind.rescue !== undefined;
  switch (described.ending.kind) {
    case "success":
    case "skipped":
      return false;
    case "failure":
      return rescuedFirst ? rescueMaySucceed : true;
    case "abnormal termination":
      return rescuedFirst
        ? rescueMaySucceed
        : target.kind.kind === "step" && target.kind.retryOnAbnormalTermination;
  }
}

/**
 * Whether the target's rescue step may succeed: unless the script says it
 * fails or terminates abnormally. A rescue step the script leaves out, or runs
 * for real, may.
 */
function rescueMaySucceed(targets: readonly Target[], target: Target): boolean {
  if (target.kind.kind !== "step" || target.kind.rescue === undefined) {
    return true;
  }
  const described = targets.find(namedAs(target.kind.rescue))?.described(1);
  return described === undefined || maySucceed(described);
}

function maySucceed(described: Described): boolean {
  return described.kind === "real run" || described.ending.kind === "success";
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
