/**
 * The scenario model: what a scenario's Given sentences declare, as plain
 * data. The runner builds the workflow, its instance and the executor from
 * it, through itinera's public API.
 */
import { ModelError } from "./model/error.js";
import {
  adapterNamed,
  type AdapterScript,
  unscriptedAdapter,
} from "./model/adapter.js";
import { Policies } from "./model/policies.js";
import { Providers } from "./model/provider.js";
import type { Dispatching, ReporterFailure } from "./model/report.js";
import {
  rescueOf,
  unscripted,
  unscriptedAs,
  type Attempts,
  type StepScript,
} from "./model/step.js";
import { TestSupport } from "./model/testing.js";
import type { Scripted } from "./model/value.js";
import type { IdGenerator, WorkflowModel } from "./model/workflow.js";

export { answerOf, type AdapterScript } from "./model/adapter.js";
export { ModelError } from "./model/error.js";
export { eventKind, type Holding } from "./model/report.js";
export {
  attempts,
  contributedUnder,
  contribution,
  emit,
  globalMetadataUnder,
  succeeds,
  type Level,
} from "./model/step.js";
export { keyAndValue, rows, type Row } from "./model/table.js";
export {
  json,
  nonValue,
  scripted,
  type Scripted,
  valueType,
  valueTypes,
  type ValueType,
} from "./model/value.js";

/** Everything a scenario declares before it acts. */
export class Model {
  #workflow: WorkflowModel | undefined;
  #dispatching: Dispatching = { kind: "unstated" };
  /** The initial data of the workflow instance, in the order written. */
  readonly initialData: [string, Scripted][] = [];
  /** The initial global metadata of the workflow instance, in the order written. */
  readonly initialGlobalMetadata: [string, Scripted][] = [];
  /** How the scripted reporters fail, wherever they are; others never fail. */
  readonly reporterFailures = new Map<string, ReporterFailure>();
  /** The policies the scenario declares, and the roles the workflow provides. */
  readonly policies = new Policies();
  /** The service providers the scenario declares. */
  readonly providers = new Providers();
  /** The test support the scenario uses. */
  readonly testing = new TestSupport();

  /** Declares the workflow, once, with its steps in declaration order. */
  declare(name: string, steps: readonly string[]): void {
    if (this.#workflow !== undefined) {
      throw new ModelError("a workflow is already declared");
    }
    this.#workflow = {
      name,
      steps,
      scripts: new Map(steps.map(unscriptedAs)),
      adapters: [],
    };
  }

  /** The workflow the scenario declared. */
  get workflow(): WorkflowModel {
    if (this.#workflow === undefined) {
      throw new ModelError("no workflow is declared yet");
    }
    return this.#workflow;
  }

  /** The script of a step, or of a rescue step, of the workflow. */
  step(name: string): StepScript {
    const script = this.workflow.scripts.get(name);
    if (script === undefined) {
      throw new ModelError(`the workflow has no step "${name}"`);
    }
    return script;
  }

  /** Declares an input adapter attached to the steps. */
  declareAdapter(name: string, steps: readonly string[]): void {
    const [first, ...rest] = steps;
    if (first === undefined) {
      throw new ModelError(
        `the input adapter "${name}" is attached to no step`,
      );
    }
    this.workflow.adapters.push(unscriptedAdapter(name, [first, ...rest]));
  }

  /** The script of an input adapter the workflow declares. */
  adapter(name: string): AdapterScript {
    const script = this.workflow.adapters.find(adapterNamed(name));
    if (script === undefined) {
      throw new ModelError(`the workflow declares no input adapter "${name}"`);
    }
    return script;
  }

  /** Says how each attempt of the step ends, once. */
  ends(name: string, attempts: Attempts): void {
    const script = this.step(name);
    if (script.attempts !== undefined) {
      throw new ModelError(
        `how the attempts of "${name}" end is already stated`,
      );
    }
    script.attempts = attempts;
  }

  /**
   * Gives the step a rescue step, scripted under its rescue step's name.
   * When a step of the workflow already has that name, the two share one
   * script, as two steps of one name do.
   */
  rescue(name: string): void {
    this.step(name).hasRescueStep = true;
    const rescue = rescueOf(name);
    const { scripts } = this.workflow;
    const script = scripts.get(rescue) ?? unscripted();
    script.isRescueStep = true;
    scripts.set(rescue, script);
  }

  /** The script of a rescue step, which only a rescue step's requests change. */
  rescueStep(name: string): StepScript {
    const script = this.step(name);
    if (!script.isRescueStep) {
      throw new ModelError(`"${name}" is not a rescue step`);
    }
    return script;
  }

  /** Says that the journey starts with no initial data. */
  emptyDataBag(): void {
    if (this.initialData.length > 0) {
      throw new ModelError("the data bag already holds initial data");
    }
  }

  /** Lists the workflow's recording reporters, once. */
  listReporters(reporters: readonly string[]): void {
    const { workflow } = this;
    if (workflow.reporters !== undefined) {
      throw new ModelError("the workflow's reporters are already listed");
    }
    workflow.reporters = reporters;
  }

  /** Says where the instance's journey ID comes from, once. */
  generateIdsWith(idGenerator: IdGenerator): void {
    const { workflow } = this;
    if (workflow.idGenerator !== undefined) {
      throw new ModelError("the workflow's ID generator is already stated");
    }
    workflow.idGenerator = idGenerator;
  }

  /** Says how a scripted reporter fails, once. */
  fails(reporter: string, failure: ReporterFailure): void {
    if (this.reporterFailures.has(reporter)) {
      throw new ModelError(
        `how the reporter "${reporter}" fails is already stated`,
      );
    }
    this.reporterFailures.set(reporter, failure);
  }

  /** What the executor is given to dispatch events. */
  get dispatching(): Dispatching {
    return this.#dispatching;
  }

  /** Says what the executor is given to dispatch events, once. */
  dispatchWith(dispatching: Dispatching): void {
    if (this.#dispatching.kind !== "unstated") {
      throw new ModelError(
        "what the executor dispatches with is already stated",
      );
    }
    this.#dispatching = dispatching;
  }
}
