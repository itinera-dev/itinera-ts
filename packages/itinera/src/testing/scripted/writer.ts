import { LocalExecutor, runScripted } from "../../executor/local.js";
import type { WorkflowInstance } from "../../instance/made.js";
import type { StepDescriptor } from "../../step.js";
import { MistakeKind, TestMistake } from "../mistake.js";
import type { NamedStep, Script } from "../scripted.js";
import { leftOut } from "./checks.js";
import { playing } from "./play.js";
import { type Built, type ScriptedRun, scriptedRun } from "./record.js";
import { StepWriter } from "./step-writer.js";
import { everyName, namedAs, type Target, targetNamed } from "./target.js";

/** A scripted run being written, before it names a step. */
export class Writer implements Script {
  readonly #instance: WorkflowInstance;
  readonly #steps: readonly StepDescriptor[];
  readonly #targets: Target[] = [];
  #all = false;

  constructor(instance: WorkflowInstance) {
    this.#instance = instance;
    this.#steps = instance.descriptor.steps();
  }

  step(name: string): NamedStep {
    const target = targetNamed(this.#steps, name);
    if (target === undefined) {
      throw new TestMistake([{ kind: MistakeKind.UnknownStep, step: name }]);
    }
    if (this.#targets.some(namedAs(name))) {
      throw new TestMistake([
        { kind: MistakeKind.StepScriptedTwice, step: name },
      ]);
    }
    this.#targets.push(target);
    return new StepWriter(this, target);
  }

  ensureAllScripted(): Script {
    this.#all = true;
    return this;
  }

  async run(
    executor: LocalExecutor = new LocalExecutor(),
  ): Promise<ScriptedRun> {
    const [first, ...others] = leftOut(this.#targets, this.#steps, this.#all);
    if (first !== undefined) {
      throw new TestMistake([first, ...others]);
    }
    const built: Built[] = [];
    const result = await runScripted(
      executor,
      this.#instance,
      playing(this.#targets, built),
    );
    return scriptedRun(result, everyName(this.#steps), built);
  }
}
