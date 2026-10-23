/**
 * The scenario's policies, put together with their builders from the
 * classes of its policy mocks, each hook given the contributor, the hook
 * reporter, then its scripted requests, in the order written.
 */
import {
  attempt,
  contributor,
  error,
  failureCause,
  failureReason,
  fromStep,
  fromWorkflow,
  hookReporter,
  journeyId,
  retryCause,
  role,
  StepHook,
  stepName,
  WorkflowHook,
} from "itinera/unstable";
import { ModelError } from "../model/error.js";
import type { HookRequest, PolicyScript } from "../model/policy.js";
import { requestTypeOf } from "../tokens.js";
import type { Witness } from "../witness.js";
import { stepEndingsOf, workflowEndingsOf } from "./policies/endings.js";
import { stepPolicyClass, workflowPolicyClass } from "./policy-mocks.js";

/** The step policy the scenario declares under the name, put together with its builder. */
export function stepPolicyOf(
  name: string,
  script: PolicyScript,
  witness: Witness,
) {
  const builder = stepPolicyClass(
    name,
    script,
    stepEndingsOf(script),
    witness,
  ).builder(name);
  for (const [hook, { requests }] of script.hooks) {
    const tokens = requests.map(requestOf);
    switch (hook) {
      case StepHook.OnStepSuccess:
        builder.onStepSuccess(
          "onStepSuccess",
          contributor(),
          hookReporter(),
          ...tokens,
        );
        break;
      case StepHook.OnStepFailure:
        builder.onStepFailure(
          "onStepFailure",
          contributor(),
          hookReporter(),
          ...tokens,
        );
        break;
      case StepHook.OnStepRetry:
        builder.onStepRetry(
          "onStepRetry",
          contributor(),
          hookReporter(),
          ...tokens,
        );
        break;
      case StepHook.OnStepAbnormalTermination:
        builder.onStepAbnormalTermination(
          "onStepAbnormalTermination",
          contributor(),
          hookReporter(),
          ...tokens,
        );
        break;
      case WorkflowHook.OnWorkflowSuccess:
      case WorkflowHook.OnWorkflowFailure:
        throw new ModelError(`the step policy "${name}" defines ${hook}`);
    }
  }
  return builder;
}

/** The workflow policy the scenario declares under the name, put together with its builder. */
export function workflowPolicyOf(
  name: string,
  script: PolicyScript,
  witness: Witness,
) {
  const builder = workflowPolicyClass(
    name,
    script,
    workflowEndingsOf(script),
    witness,
  ).builder(name);
  for (const [hook, { requests }] of script.hooks) {
    const tokens = requests.map(workflowRequestOf);
    switch (hook) {
      case WorkflowHook.OnWorkflowSuccess:
        builder.onWorkflowSuccess(
          "onWorkflowSuccess",
          contributor(),
          hookReporter(),
          ...tokens,
        );
        break;
      case WorkflowHook.OnWorkflowFailure:
        builder.onWorkflowFailure(
          "onWorkflowFailure",
          contributor(),
          hookReporter(),
          ...tokens,
        );
        break;
      case StepHook.OnStepSuccess:
      case StepHook.OnStepFailure:
      case StepHook.OnStepRetry:
      case StepHook.OnStepAbnormalTermination:
        throw new ModelError(`the workflow policy "${name}" defines ${hook}`);
    }
  }
  return builder;
}

function requestOf(request: HookRequest) {
  switch (request.kind) {
    case "step data":
      return fromStep(
        request.key,
        requestTypeOf(request.type, request.optional),
      );
    case "data from the workflow":
      return fromWorkflow(
        request.key,
        requestTypeOf(request.type, request.optional),
      );
    case "failure reason":
      return failureReason({ optional: request.optional });
    case "error":
      return error();
    case "failure cause":
      return failureCause();
    case "retry cause":
      return retryCause();
    case "step name":
      return stepName();
    case "attempt number":
      return attempt();
    case "journey ID":
      return journeyId();
    case "role":
      return role<unknown>();
  }
}

function workflowRequestOf(request: HookRequest) {
  switch (request.kind) {
    case "data from the workflow":
      return fromWorkflow(
        request.key,
        requestTypeOf(request.type, request.optional),
      );
    case "journey ID":
      return journeyId();
    case "role":
      return role<unknown>();
    case "step data":
    case "failure reason":
    case "error":
    case "failure cause":
    case "retry cause":
    case "step name":
    case "attempt number":
      throw new ModelError(
        `a workflow hook cannot request the ${request.kind}`,
      );
  }
}
