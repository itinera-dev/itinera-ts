/**
 * What the runner builds from the scenario model, through itinera's public
 * API: the workflow, put together with the builder from test support's step
 * mocks, and its instances.
 */
import {
  type Built,
  contributor,
  dataBag,
  fromWorkflow,
  input,
  key,
  type StepName,
  stepName,
  stepReporter,
  type Supplied,
  type Value,
  type WorkflowInstance,
  Workflow,
} from "itinera/unstable";
import { Adapters } from "./adapters.js";
import { given } from "./given.js";
import { type AdapterRequest, refuseUnheldAccess } from "./model/adapter.js";
import type { Input } from "./model/step.js";
import type { Scripted } from "./model/value.js";
import type { Model } from "./model.js";
import type { Recorders } from "./recorders.js";
import { actingOf } from "./scenario/actions.js";
import { mockScriptOf } from "./scenario/mock.js";
import { requestTypeOf, tokenOf } from "./tokens.js";
import type { Witness } from "./witness.js";

/**
 * The workflow class of every scenario, which declares nothing: the builder
 * puts each scenario's workflow together on it, its ID generator returns the
 * journey ID the scenario gives, and every input adapter the scenario
 * declares is its method `adapt`, which plays the script of the adapter
 * attached to the step it is called for.
 */
export class Scenario extends Workflow {
  readonly #adapters: Adapters;

  constructor(
    readonly id: string,
    adapters: Adapters,
  ) {
    super();
    this.#adapters = adapters;
  }

  /** The journey ID the scenario's ID generator returns. */
  journeyId(): string {
    return this.id;
  }

  /**
   * What the adapter attached to `step` returns for the input of `key`,
   * given what its own requests were answered with, in order.
   */
  adapt(step: StepName, key: string, ...answers: unknown[]): Supplied {
    const reply = this.#adapters.reply(step, key, answers);
    return reply.isSome()
      ? this.supply(given(reply.value))
      : this.fromDataBag();
  }
}

/**
 * The workflow the scenario declares, put together with the builder, each
 * step a step mock the witness keeps.
 *
 * @throws Violations when the builder refuses the workflow.
 * @throws NotRunYet when the scenario scripts what the runner cannot run.
 * @throws ModelError when an input adapter's script uses a data bag access
 * it could never hold.
 */
export function workflowOf(model: Model, witness: Witness): Built<Scenario> {
  const { name, steps, adapters, idGenerator } = model.workflow;
  const builder = Scenario.builder().name(name);
  for (const step of steps) {
    const script = model.step(step);
    const mock = witness
      .classOf(step, mockScriptOf(script), actingOf(script))
      .builder(step)
      .needs(...script.inputs.map(inputOf))
      .run(contributor(), stepReporter())
      .retryBudget(script.retries);
    builder.step(
      script.retriesAbnormalTerminations
        ? mock
        : mock.noRetryOnAbnormalTermination(),
    );
  }
  for (const adapter of adapters) {
    refuseUnheldAccess(adapter);
    builder.inputAdapter(
      "adapt",
      adapter,
      stepName(),
      key(),
      ...adapter.requests.map(requestOf),
    );
  }
  const played = new Adapters(adapters);
  if (idGenerator?.kind === "returns") {
    return builder
      .idGenerator("journeyId")
      .constructWith(idGenerator.id, played)
      .build();
  }
  return builder.constructWith("", played).build();
}

function inputOf({ key, type, optional }: Input) {
  return input(key, requestTypeOf(type, optional));
}

function requestOf(request: AdapterRequest) {
  switch (request.kind) {
    case "data bag":
      return dataBag();
    case "step name":
      return stepName();
    case "data from the workflow":
      return fromWorkflow(request.key, tokenOf(request.type));
  }
}

/**
 * A new instance of the workflow, with the initial data and global metadata
 * the scenario gives, which makes each reporter the workflow lists with its
 * journey ID.
 */
export function instanceOf(
  workflow: Built<Scenario>,
  model: Model,
  recorders: Recorders,
): WorkflowInstance<Scenario> {
  const { reporters = [] } = model.workflow;
  return workflow.instance(model.initialData.map(asGiven), {
    reporters: reporters.map((name) => recorders.makerOf(name)),
    reportersGlobalMetadata: model.initialGlobalMetadata.map(asGiven),
  });
}

function asGiven([key, scripted]: readonly [string, Scripted]): [
  string,
  Value,
] {
  return [key, given(scripted)];
}
