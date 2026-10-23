/**
 * What the runner builds from the scenario model, through itinera's public
 * API: the workflow, put together with the builder from test support's step
 * mocks, its instances and the executor.
 */
import {
  type Built,
  Ending,
  LocalExecutor,
  type StepMockScript,
  type StepOptions,
  type Value,
  type WorkflowInstance,
  Workflow,
} from "itinera/unstable";
import type { Dispatching } from "./model/report.js";
import type { AttemptScript } from "./model/step/attempt.js";
import type { StepScript } from "./model/step.js";
import type { Scripted } from "./model/value.js";
import type { Model } from "./model.js";
import { RecordingDispatcherFactory } from "./record.js";
import type { Recorders } from "./recorders.js";
import type { Witness } from "./witness.js";

/** The name of the recording reporter the runner's own dispatchers hold. */
export const runnersRecorder = "the runner's recorder";

/** The message of an abnormal termination the case scripts with none. */
const unwrittenMessage = "the scripted step terminated abnormally";

/**
 * The workflow class of every scenario, which declares nothing: the builder
 * puts each scenario's workflow together on it, and its ID generator
 * returns the journey ID the scenario gives.
 */
export class Scenario extends Workflow {
  constructor(readonly id: string) {
    super();
  }

  /** The journey ID the scenario's ID generator returns. */
  journeyId(): string {
    return this.id;
  }
}

/**
 * A sentence of the case that the runner cannot run yet, because the stage
 * of itinera that makes it run has not landed.
 */
class NotRunYet extends Error {
  override readonly name = "NotRunYet";

  constructor(what: string) {
    super(`the runner cannot run ${what} yet`);
  }
}

/**
 * The workflow the scenario declares, put together with the builder, each
 * step a step mock the witness keeps.
 *
 * @throws Violations when the builder refuses the workflow.
 * @throws NotRunYet when the scenario scripts what the runner cannot run.
 */
export function workflowOf(
  model: Model,
  recorders: Recorders,
  witness: Witness,
): Built<Scenario> {
  const { name, steps, reporters = [], idGenerator } = model.workflow;
  const builder = Scenario.builder().name(name);
  for (const step of steps) {
    const script = model.step(step);
    builder.step(witness.classOf(step, mockScriptOf(script)), {
      ...optionsOf(script),
      name: step,
    });
  }
  for (const reporter of reporters) {
    builder.reporter(recorders.classOf(reporter));
  }
  if (idGenerator?.kind === "returns") {
    return builder
      .idGenerator("journeyId")
      .constructWith(idGenerator.id)
      .build();
  }
  return builder.constructWith("").build();
}

function optionsOf(script: StepScript): Omit<StepOptions, "name"> {
  return {
    retryBudget: script.retries,
    noRetryOnAbnormalTermination: !script.retriesAbnormalTerminations,
  };
}

function mockScriptOf(script: StepScript): StepMockScript {
  refuseWhatDoesNotRunYet(script);
  const [first = Ending.success, ...rest] = (script.attempts ?? []).map(
    endingOf,
  );
  return {
    attempts: [first, ...rest],
    asynchronous: script.asynchronous,
    ...(script.constructorFailure === undefined
      ? {}
      : { buildFailure: script.constructorFailure }),
  };
}

function refuseWhatDoesNotRunYet(script: StepScript): void {
  const notYet = [
    script.inputs.length > 0 && "inputs",
    script.actions.length > 0 && "contributions, emits or global metadata",
    (script.hasRescueStep || script.isRescueStep) && "rescue steps",
    script.ignoresFailedEmits && "failed emits",
    script.keepsHandles && "kept handles",
  ].find(isNamed);
  if (notYet !== undefined) {
    throw new NotRunYet(notYet);
  }
}

function isNamed(what: string | false): what is string {
  return what !== false;
}

function endingOf(attempt: AttemptScript): Ending {
  if (attempt.contributes.length > 0) {
    throw new NotRunYet("contributions");
  }
  switch (attempt.outcome.kind) {
    case "success":
      return Ending.success;
    case "error":
      return Ending.abnormalTermination(
        attempt.outcome.message ?? unwrittenMessage,
      );
    case "failure":
    case "skipped":
      throw new NotRunYet("an attempt that fails or is skipped");
  }
}

/** A new instance of the workflow, with the initial data and global metadata the scenario gives. */
export function instanceOf(
  workflow: Built<Scenario>,
  model: Model,
): WorkflowInstance<Scenario> {
  return workflow.instance(model.initialData.map(asGiven), {
    reportersGlobalMetadata: model.initialGlobalMetadata.map(asGiven),
  });
}

function asGiven([key, given]: readonly [string, Scripted]): [string, Value] {
  return [key, given.kind === "value" ? given.value : notAValue()];
}

/** Something that is not a value: a function, which only a cast lets through. */
function notAValue(): Value {
  return notAValue as unknown as Value;
}

/** The executor the scenario runs its journeys with, dispatching as it says. */
export function executorOf(
  dispatching: Dispatching,
  recorders: Recorders,
): LocalExecutor {
  switch (dispatching.kind) {
    case "default":
      return new LocalExecutor();
    case "unstated":
      return new LocalExecutor(
        new RecordingDispatcherFactory(recorders.make(runnersRecorder), {
          kind: "makes",
          holding: { kind: "adds reporters" },
        }),
      );
    case "holding":
      return new LocalExecutor(
        new RecordingDispatcherFactory(recorders.make(dispatching.reporter), {
          kind: "makes",
          holding: dispatching.holding,
        }),
      );
    case "failing factory":
      return new LocalExecutor(
        new RecordingDispatcherFactory(recorders.make(runnersRecorder), {
          kind: "fails",
        }),
      );
  }
}
