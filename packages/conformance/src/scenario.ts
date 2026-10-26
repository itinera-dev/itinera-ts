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
  type ListedStep,
  stepName,
  type StepBuilder,
  stepReporter,
  type WorkflowBuilder,
  type WorkflowInstance,
} from "itinera/unstable";
import { type Value } from "itinera/value";
import { Adapters } from "./adapters.js";
import { given } from "./given.js";
import { type AdapterRequest, refuseUnheldAccess } from "./model/adapter.js";
import type { Input } from "./model/step.js";
import type { Scripted } from "./model/value.js";
import type { Model } from "./model.js";
import type { Recorders } from "./recorders.js";
import { actingOf } from "./scenario/actions.js";
import { mockScriptOf } from "./scenario/mock.js";
import { stepPolicyOf, workflowPolicyOf } from "./scenario/policies.js";
import { Scenario } from "./scenario/workflow.js";
import { requestTypeOf, tokenOf } from "./tokens.js";
import type { ActingClass, Witness } from "./witness.js";

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
  return builderOf(model, witness).build();
}

/**
 * The listing of the workflow the scenario declares, read from its builder
 * without building it.
 *
 * @throws Violations when the builder refuses the workflow.
 */
export function listingOf(
  model: Model,
  witness: Witness,
): readonly ListedStep[] {
  return builderOf(model, witness).listing();
}

/** The step's builder, with the scenario's policy `policy` attached. */
function withPolicy(
  attached: StepBuilder<ActingClass>,
  policy: string,
  model: Model,
  witness: Witness,
): StepBuilder<ActingClass> {
  return attached.policy(
    stepPolicyOf(policy, model.policies.policy(policy), witness),
  );
}

function builderOf(
  model: Model,
  witness: Witness,
): WorkflowBuilder<typeof Scenario, true> {
  const { name, steps, adapters, idGenerator } = model.workflow;
  const builder = Scenario.builder().name(name);
  for (const step of steps) {
    const script = model.step(step);
    const scripted = witness
      .classOf(
        step,
        mockScriptOf(script),
        actingOf(script),
        script.keepsHandles,
      )
      .builder(step)
      .needs(...script.inputs.map(inputOf))
      .run(contributor(), stepReporter())
      .retryBudget(script.retries);
    const mock = (script.policies ?? []).reduce(
      (attached, policy) => withPolicy(attached, policy, model, witness),
      scripted,
    );
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
  for (const policy of model.policies.workflowHas ?? []) {
    builder.policy(
      workflowPolicyOf(policy, model.policies.policy(policy), witness),
    );
  }
  const played = new Adapters(adapters);
  const { roles } = witness;
  if (idGenerator?.kind === "returns") {
    return builder
      .idGenerator("journeyId")
      .constructWith(idGenerator.id, played, roles);
  }
  return builder.constructWith("", played, roles);
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
