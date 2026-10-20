/**
 * A scenario's script, written through test support's scripted runs, row by
 * row, as a test writes it.
 */
import type { WorkflowInstance } from "itinera/instance";
import {
  type AttemptChoice,
  type AttemptContributing,
  type AttemptEmitting,
  type AttemptScript,
  type AttemptSettingGlobalMetadata,
  type Script,
  scripted,
  type ScriptedRun,
  type StepScript,
} from "itinera/testing";
import type { PlainValue } from "itinera/value";
import { ModelError } from "./model/error.js";
import type { ScriptEnding, ScriptRow } from "./model/testing.js";

/** Where the script is while its rows are written: before any step, or at the step named last. */
type Writing =
  | { readonly kind: "unnamed"; readonly script: Script }
  | {
      readonly kind: "named";
      readonly script: StepScript;
      readonly step: string;
    };

/**
 * Writes the script of `rows` for `instance`, asking for every step to be
 * scripted when `ensuresAll`, and runs it.
 *
 * @throws TestMistake where a row makes a mistake in writing the script, or,
 * as a rejection, when the script leaves something out.
 * @throws ModelError when a row that runs the real step does more.
 */
export function runScript(
  instance: WorkflowInstance,
  rows: readonly ScriptRow[],
  ensuresAll: boolean,
): Promise<ScriptedRun> {
  const { script } = rows.reduce<Writing>(written, {
    kind: "unnamed",
    script: scripted(instance),
  });
  return (ensuresAll ? script.ensureAllScripted() : script).run();
}

function written(writing: Writing, row: ScriptRow): Writing {
  return {
    kind: "named",
    script: ended(chosen(choosing(writing, row), row), row),
    step: row.step,
  };
}

/**
 * The step of the row, named with `step` for the first, and with `and step`
 * for each that differs from the step before, so a step whose rows another
 * step's interrupt is named again.
 */
function choosing(writing: Writing, row: ScriptRow): AttemptChoice {
  if (writing.kind === "unnamed") {
    return writing.script.step(row.step);
  }
  return writing.step === row.step
    ? writing.script
    : writing.script.andStep(row.step);
}

function chosen(choice: AttemptChoice, row: ScriptRow): AttemptScript {
  switch (row.attempt) {
    case "every":
      return choice.onEveryAttempt();
    case "remaining":
      return choice.onRemainingAttempts();
    default:
      return choice.onAttempt(row.attempt);
  }
}

function ended(attempts: AttemptScript, row: ScriptRow): StepScript {
  if (row.ending.kind === "real run") {
    if (doesMore(row)) {
      throw new ModelError(
        `a row of step "${row.step}" runs the real step and does more`,
      );
    }
    return attempts.willRunForReal();
  }
  const contributing = row.contributes.reduce<AttemptContributing>(
    contributed,
    attempts,
  );
  const emitting: AttemptEmitting =
    row.emits === undefined
      ? contributing
      : contributing.willEmit(row.emits.level, row.emits.message);
  const setting = row.setsGlobalMetadata.reduce<AttemptSettingGlobalMetadata>(
    set,
    emitting,
  );
  return endedWith(setting, row.ending);
}

function doesMore(row: ScriptRow): boolean {
  return (
    row.contributes.length > 0 ||
    row.emits !== undefined ||
    row.setsGlobalMetadata.length > 0
  );
}

function contributed(
  attempts: AttemptContributing,
  [key, value]: readonly [string, PlainValue],
): AttemptContributing {
  return attempts.willContribute<PlainValue>(key, value);
}

function set(
  attempts: AttemptSettingGlobalMetadata,
  [key, value]: readonly [string, PlainValue],
): AttemptSettingGlobalMetadata {
  return attempts.willSetGlobalMetadata<PlainValue>(key, value);
}

function endedWith(
  attempts: AttemptSettingGlobalMetadata,
  ending: Exclude<ScriptEnding, { readonly kind: "real run" }>,
): StepScript {
  switch (ending.kind) {
    case "success":
      return attempts.willSucceed();
    case "failure":
      return attempts.willFail(ending.code);
    case "skipped":
      return ending.code === undefined
        ? attempts.willSkip()
        : attempts.willSkipBecause(ending.code);
    case "abnormal termination":
      return attempts.willTerminateAbnormally(ending.message);
  }
}
