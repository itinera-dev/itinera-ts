/**
 * What the runner builds from the scenario model, through itinera's public
 * API: the workflow, put together with the builder from test support's step
 * mocks, and its instances.
 */
import { contributor, dataBag } from "itinera/journey";
import { stepName, type StepBuilder, stepReporter } from "itinera/step";
import {
  type Built,
  fromWorkflow,
  key,
  type ListedStep,
  type WorkflowBuilder,
} from "itinera/workflow";
import { Adapters } from "./adapters.js";
import { type AdapterRequest, refuseUnheldAccess } from "./model/adapter.js";
import type { ProviderScript } from "./model/provider.js";
import { ModelError } from "./model/error.js";
import { rescueOf, type StepScript } from "./model/step.js";
import type { Model } from "./model.js";
import { actingOf } from "./scenario/actions.js";
import { mockScriptOf } from "./scenario/mock.js";
import { stepPolicyOf, workflowPolicyOf } from "./scenario/policies.js";
import { provideWith } from "./scenario/providers.js";
import { inputOf, serviceOf } from "./scenario/requests.js";
import { rescueStepOf } from "./scenario/rescue.js";
import { type Scenario, serving } from "./scenario/workflow.js";
import { tokenOf } from "./tokens.js";
import type { ActingClass, Witness } from "./witness.js";

export {
  asGiven,
  type GivenReporter,
  instanceOf,
} from "./scenario/instance.js";

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
    const built = witness
      .classOf(
        step,
        mockScriptOf(script),
        actingOf(script),
        script.keepsHandles,
        script.services,
      )
      .builder(step)
      .needs(...script.inputs.map(inputOf));
    const scripted = withHandles(built, step, script).retryBudget(
      script.retries,
    );
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

/**
 * The step's builder, its `run` requesting a contributor, a step reporter,
 * then its services, unless it declares no handles, when it requests
 * nothing.
 *
 * @throws ModelError when a step that declares no handles requests a service.
 */
function withHandles(
  built: StepBuilder<ActingClass>,
  step: string,
  script: StepScript,
): StepBuilder<ActingClass> {
  if (script.declaresHandles) {
    return built.run(
      contributor(),
      stepReporter(),
      ...script.services.map(serviceOf),
    );
  }
  if (script.services.length > 0) {
    throw new ModelError(
      `step "${step}" declares no contributor and no reporter, so it cannot request a service`,
    );
  }
  return built;
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
