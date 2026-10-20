/**
 * What the runner builds from the scenario model, through itinera's public
 * API: the workflow, put together with the builder from test support's step
 * mocks, and its instances.
 */
import type { WorkflowInstance } from "itinera/instance";
import { contributor, dataBag } from "itinera/journey";
import { stepName, type StepBuilder, stepReporter } from "itinera/step";
import {
  type Built,
  fromWorkflow,
  key,
  type ListedStep,
  type WorkflowBuilder,
} from "itinera/workflow";
import { type Value } from "itinera/value";
import { Adapters } from "./adapters.js";
import { given } from "./given.js";
import { type AdapterRequest, refuseUnheldAccess } from "./model/adapter.js";
import type { ProviderScript } from "./model/provider.js";
import { rescueOf } from "./model/step.js";
import type { Scripted } from "./model/value.js";
import type { Model } from "./model.js";
import type { Recorders } from "./recorders.js";
import { actingOf } from "./scenario/actions.js";
import { mockScriptOf } from "./scenario/mock.js";
import { stepPolicyOf, workflowPolicyOf } from "./scenario/policies.js";
import { provideWith } from "./scenario/providers.js";
import { inputOf, serviceOf } from "./scenario/requests.js";
import { rescueStepOf } from "./scenario/rescue.js";
import { type Scenario, serving } from "./scenario/workflow.js";
import { tokenOf } from "./tokens.js";
import type { ActingClass, Witness } from "./witness.js";

/**
 * The workflow the scenario declares, put together with the builder, each
 * step a step mock the witness keeps.
 *
 * @throws Violations when the builder refuses the workflow.
 * @throws ModelError when an input adapter's script uses a data bag access
 * it could never hold, or a rescue step's script says it skips.
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
  const { scripts: providers } = model.providers;
  const builder = serving(providers.map(nameOf)).builder().name(name);
  for (const step of steps) {
    const script = model.step(step);
    const scripted = witness
      .classOf(
        step,
        mockScriptOf(script),
        actingOf(script),
        script.keepsHandles,
        script.services,
      )
      .builder(step)
      .needs(...script.inputs.map(inputOf))
      .run(contributor(), stepReporter(), ...script.services.map(serviceOf))
      .retryBudget(script.retries);
    const rescued = script.hasRescueStep
      ? scripted.rescue(rescueStepOf(rescueOf(step), model, witness))
      : scripted;
    const mock = (script.policies ?? []).reduce(
      (attached, policy) => withPolicy(attached, policy, model, witness),
      rescued,
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
  provideWith(builder, providers);
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
      .constructWith(idGenerator.id, played, roles, witness.providers);
  }
  return builder.constructWith("", played, roles, witness.providers);
}

function nameOf({ name }: ProviderScript): string {
  return name;
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
