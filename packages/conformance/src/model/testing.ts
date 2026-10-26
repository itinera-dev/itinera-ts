import { ModelError } from "./error.js";
import type { Implementation } from "./provider.js";
import { type ScriptRow, scriptRows } from "./testing/script.js";
import type { Row } from "./table.js";
import type { Scripted } from "./value.js";

export type { ScriptEnding, ScriptRow } from "./testing/script.js";

/**
 * What a fake of a service provider does on every call: make an instance of
 * an implementation of `labeller`, with data if the scenario gives some,
 * fail, or make meters, another service than a `labeller`.
 */
export type Fake =
  | {
      readonly kind: "makes";
      readonly implementation: Implementation;
      readonly data?: Scripted;
    }
  | { readonly kind: "fails"; readonly message: string }
  | { readonly kind: "makes meters" };

/** What a scenario says of the test support it uses. */
export class TestSupport {
  #recordingReporter = false;
  #script: readonly ScriptRow[] | undefined;
  #ensuresAll = false;
  #stepRecorderFails = false;
  #hookRecorderFails = false;
  /** The fakes the test gives the instance, by the name of the provider each replaces. */
  readonly fakes = new Map<string, Fake>();

  /** Whether the instance has test support's recording reporter. */
  get recordingReporter(): boolean {
    return this.#recordingReporter;
  }

  /** Gives the instance test support's recording reporter, once. */
  addRecordingReporter(): void {
    this.#recordingReporter = once(
      this.#recordingReporter,
      "the instance already has the recording reporter of test support",
    );
  }

  /** Replaces the service provider named with a fake, once. */
  fake(provider: string, fake: Fake): void {
    if (this.fakes.has(provider)) {
      throw new ModelError(
        `the service provider "${provider}" is already replaced with a fake`,
      );
    }
    this.fakes.set(provider, fake);
  }

  /** The rows of the script, in the order written, once the scenario gives them. */
  get script(): readonly ScriptRow[] {
    if (this.#script === undefined) {
      throw new ModelError("the scenario gives no script");
    }
    return this.#script;
  }

  /** Gives the script, once, from the rows of its table. */
  says(rows: readonly Row[]): void {
    if (this.#script !== undefined) {
      throw new ModelError("the script is already given");
    }
    this.#script = scriptRows(rows);
  }

  /** Whether the script asks for every step to be scripted. */
  get ensuresAll(): boolean {
    return this.#ensuresAll;
  }

  /** Asks the script for every step to be scripted, once. */
  ensureAll(): void {
    this.#ensuresAll = once(
      this.#ensuresAll,
      "the script already ensures every step is scripted",
    );
  }

  /** Whether the step event reporter is made failing. */
  get stepRecorderFails(): boolean {
    return this.#stepRecorderFails;
  }

  /** Makes the step event reporter failing, once. */
  failStepRecorder(): void {
    this.#stepRecorderFails = once(
      this.#stepRecorderFails,
      "the step event reporter is already failing",
    );
  }

  /** Whether the hook event reporter is made failing. */
  get hookRecorderFails(): boolean {
    return this.#hookRecorderFails;
  }

  /** Makes the hook event reporter failing, once. */
  failHookRecorder(): void {
    this.#hookRecorderFails = once(
      this.#hookRecorderFails,
      "the hook event reporter is already failing",
    );
  }
}

/** `true`, once: a flag a sentence sets, which it may not set twice. */
function once(set: boolean, twice: string): true {
  if (set) {
    throw new ModelError(twice);
  }
  return true;
}
