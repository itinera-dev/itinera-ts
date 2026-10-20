import type { LocalExecutor } from "../../executor.js";
import type { Reason } from "../../step.js";
import type { AsValue } from "../../value.js";
import { captured } from "../captured.js";
import type { Level } from "../emitted.js";
import { Ending } from "../ending.js";
import { type Mistake, MistakeKind, TestMistake } from "../mistake.js";
import type {
  AttemptContributing,
  AttemptEmitting,
  AttemptScript,
  AttemptSettingGlobalMetadata,
  NamedStep,
  Script,
  StepScript,
} from "../scripted.js";
import type { ScriptedRun } from "./record.js";
import type { Action, Described, Target } from "./target.js";

/**
 * A scripted run being written, describing the attempts of the step it last
 * named: attempt 1 until another is chosen.
 */
export class StepWriter implements NamedStep, StepScript {
  readonly #script: Script;
  readonly #target: Target;
  #slot: number | "remaining" = 1;
  #actions: Action[] = [];

  constructor(script: Script, target: Target) {
    this.#script = script;
    this.#target = target;
  }

  andStep(name: string): NamedStep {
    return this.#script.step(name);
  }

  ensureAllScripted(): StepScript {
    this.#script.ensureAllScripted();
    return this;
  }

  run(executor?: LocalExecutor): Promise<ScriptedRun> {
    return this.#script.run(executor);
  }

  onAttempt(attempt: number): AttemptScript {
    const next = this.#target.numbered.length + 1;
    if (!Number.isInteger(attempt) || attempt < 1) {
      this.#mistakenOn(MistakeKind.NoSuchAttempt, attempt);
    }
    if (this.#target.rest !== undefined || attempt < next) {
      this.#mistakenOn(MistakeKind.AttemptScriptedTwice, attempt);
    }
    if (attempt > this.#target.mostAttempts) {
      this.#mistakenOn(MistakeKind.NoSuchAttempt, attempt);
    }
    if (attempt > next) {
      this.#mistakenOn(MistakeKind.GapInTheAttempts, attempt);
    }
    this.#slot = attempt;
    return this;
  }

  onEveryAttempt(): AttemptScript {
    if (this.#target.numbered.length > 0 || this.#target.rest !== undefined) {
      this.#mistakenOn(MistakeKind.AttemptScriptedTwice, 1);
    }
    this.#slot = "remaining";
    return this;
  }

  onRemainingAttempts(): AttemptScript {
    const next = this.#target.numbered.length + 1;
    if (this.#target.rest !== undefined) {
      this.#mistakenOn(MistakeKind.AttemptScriptedTwice, next);
    }
    if (next > this.#target.mostAttempts) {
      this.#mistakenOn(MistakeKind.NoSuchAttempt, next);
    }
    this.#slot = "remaining";
    return this;
  }

  willRunForReal(): StepScript {
    return this.#described({ kind: "real run" });
  }

  willContribute<T>(key: string, value: T & AsValue<T>): AttemptContributing {
    if (!this.#target.contributes) {
      this.#mistaken(MistakeKind.NoContributor);
    }
    this.#actions.push({
      kind: "contribute",
      key,
      value: captured(value, `the value contributed under ${key}`),
    });
    return this;
  }

  willEmit<T = undefined>(
    level: Level,
    message: string,
    data?: T & AsValue<T>,
  ): AttemptEmitting {
    if (!this.#target.reports) {
      this.#mistaken(MistakeKind.NoReporter);
    }
    this.#actions.push({
      kind: "emit",
      level,
      message,
      data:
        data === undefined
          ? undefined
          : captured(data, `the data emitted with ${message}`),
    });
    return this;
  }

  willSetGlobalMetadata<T>(
    key: string,
    value: T & AsValue<T>,
  ): AttemptSettingGlobalMetadata {
    if (!this.#target.reports) {
      this.#mistaken(MistakeKind.NoReporter);
    }
    this.#actions.push({
      kind: "set global metadata",
      key,
      value: captured(value, `the global metadata ${key}`),
    });
    return this;
  }

  willSucceed(): StepScript {
    return this.#ended(Ending.success);
  }

  willFail(reason: Reason | string): StepScript {
    return this.#ended(Ending.failure(reason));
  }

  willSkip(): StepScript {
    this.#skips();
    return this.#ended(Ending.skip);
  }

  willSkipBecause(reason: Reason | string): StepScript {
    this.#skips();
    return this.#ended(Ending.skipBecause(reason));
  }

  willTerminateAbnormally(errorMessage: string): StepScript {
    return this.#ended(Ending.abnormalTermination(errorMessage));
  }

  #skips(): void {
    if (this.#target.kind.kind === "rescue") {
      this.#mistaken(MistakeKind.RescueStepSkips);
    }
  }

  #ended(ending: Ending): StepScript {
    const actions = this.#actions;
    this.#actions = [];
    return this.#described({ kind: "played", actions, ending });
  }

  #described(described: Described): StepScript {
    if (this.#slot === "remaining") {
      this.#target.rest = described;
    } else {
      this.#target.numbered.push(described);
    }
    return this;
  }

  #mistaken(kind: OfTheStep["kind"]): never {
    throw new TestMistake([{ kind, step: this.#target.name }]);
  }

  #mistakenOn(kind: OfAnAttempt["kind"], attempt: number): never {
    throw new TestMistake([{ kind, step: this.#target.name, attempt }]);
  }
}

type OfAnAttempt = Extract<Mistake, { readonly attempt: number }>;

type OfTheStep = Exclude<
  Mistake,
  OfAnAttempt | { readonly rescued: string } | { readonly provider: string }
>;
