import type { PlainValue } from "itinera/value";
import type { StepAction, StepScript } from "../step.js";
import type { Scripted } from "../value.js";
import type { AttemptScript } from "./attempt.js";

/**
 * Every value the step's script contributes under `key`, on any attempt, as
 * written: a contribution's value, and the content it is then changed to.
 */
export function contributedUnder(
  script: StepScript,
  key: string,
): PlainValue[] {
  return [
    ...script.actions.filter(contributing(key)).flatMap(valuesOf),
    ...(script.attempts ?? [])
      .flatMap(contributionsOf)
      .filter(under(key))
      .map(([, value]) => value),
  ];
}

/** Every value the script of a step or a provider sets as global metadata under `key`, as written. */
export function globalMetadataUnder(
  script: { readonly actions: readonly StepAction[] },
  key: string,
): PlainValue[] {
  return script.actions.filter(setting(key)).flatMap(valuesOf);
}

function setting(key: string): (action: StepAction) => boolean {
  return (action) => isSettingOf(action, key);
}

function isSettingOf(action: StepAction, key: string): boolean {
  return action.kind === "set global metadata" && action.key === key;
}

function contributing(key: string): (action: StepAction) => boolean {
  return (action) => isContributionOf(action, key);
}

function isContributionOf(action: StepAction, key: string): boolean {
  return (
    (action.kind === "contribute" ||
      action.kind === "contribute then change") &&
    action.key === key
  );
}

/** The values the action gives, as written, those that are not values left out. */
function valuesOf(action: StepAction): PlainValue[] {
  switch (action.kind) {
    case "contribute":
      return valueOf(action.value);
    case "contribute then change":
      return [...valueOf(action.value), ...valueOf(action.changed)];
    case "set global metadata":
      return valueOf(action.value);
    case "change input":
    case "emit":
      return [];
  }
}

function valueOf(scripted: Scripted): PlainValue[] {
  return scripted.kind === "value" ? [scripted.value] : [];
}

function contributionsOf(
  attempt: AttemptScript,
): readonly (readonly [string, PlainValue])[] {
  return attempt.contributes;
}

function under(key: string): (entry: readonly [string, PlainValue]) => boolean {
  return (entry) => isEntryUnder(entry, key);
}

function isEntryUnder(
  [written]: readonly [string, PlainValue],
  key: string,
): boolean {
  return written === key;
}
