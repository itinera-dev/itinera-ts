/**
 * The classes of the scenario's policies: test support's policy mocks,
 * each hook keeping its call with the witness and playing its script before
 * the mock ends it.
 */
import type { Contributor } from "itinera/journey";
import type { HookReporter, OnFailure, OnSuccess } from "itinera/policy";
import {
  type StepPolicyMock,
  stepPolicyMock,
  type StepPolicyMockScript,
  type WorkflowPolicyMock,
  workflowPolicyMock,
  type WorkflowPolicyMockScript,
} from "itinera/unstable";
import type { Hook, PolicyScript } from "../model/policy.js";
import type { Witness } from "../witness.js";
import { hookActed } from "./hooks.js";

/** Keeps a call of the hook on the mock, then plays what the hook's script does. */
type Playing = (
  mock: StepPolicyMock | WorkflowPolicyMock,
  hook: Hook,
  lent: Lent,
  answers: readonly unknown[],
) => Promise<void>;

/** The handles a scripted hook is always lent, before its scripted requests. */
interface Lent {
  readonly contributor: Contributor;
  readonly reporter: HookReporter;
  /** How many calls of the policy's hooks its instance has seen, this one included. */
  readonly count: number;
}

/**
 * The class of the scenario's step policy named so, from a policy mock
 * ending its hooks as `endings` says. Each hook takes the contributor and
 * the hook reporter, then what its scripted requests are answered with.
 */
export function stepPolicyClass(
  name: string,
  script: PolicyScript,
  endings: StepPolicyMockScript,
  witness: Witness,
) {
  const played = playing(name, script, witness);
  return class Scripted extends stepPolicyMock(endings) {
    #count = 0;

    override async onStepSuccess(
      contributor: Contributor,
      reporter: HookReporter,
      ...answers: unknown[]
    ): Promise<OnSuccess> {
      const lent = { contributor, reporter, count: (this.#count += 1) };
      await played(this, "on step success", lent, answers);
      return super.onStepSuccess(contributor, reporter, ...answers);
    }

    override async onStepFailure(
      contributor: Contributor,
      reporter: HookReporter,
      ...answers: unknown[]
    ): Promise<OnFailure> {
      const lent = { contributor, reporter, count: (this.#count += 1) };
      await played(this, "on step failure", lent, answers);
      return super.onStepFailure(contributor, reporter, ...answers);
    }

    override async onStepRetry(
      contributor: Contributor,
      reporter: HookReporter,
      ...answers: unknown[]
    ): Promise<OnFailure> {
      const lent = { contributor, reporter, count: (this.#count += 1) };
      await played(this, "on step retry", lent, answers);
      return super.onStepRetry(contributor, reporter, ...answers);
    }

    override async onStepAbnormalTermination(
      contributor: Contributor,
      reporter: HookReporter,
      ...answers: unknown[]
    ): Promise<OnFailure> {
      const lent = { contributor, reporter, count: (this.#count += 1) };
      await played(this, "on step abnormal termination", lent, answers);
      return super.onStepAbnormalTermination(contributor, reporter, ...answers);
    }
  };
}

/**
 * The class of the scenario's workflow policy named so, from a policy mock
 * ending its hooks as `endings` says, its hooks taking what a step
 * policy's take.
 */
export function workflowPolicyClass(
  name: string,
  script: PolicyScript,
  endings: WorkflowPolicyMockScript,
  witness: Witness,
) {
  const played = playing(name, script, witness);
  return class Scripted extends workflowPolicyMock(endings) {
    #count = 0;

    override async onWorkflowSuccess(
      contributor: Contributor,
      reporter: HookReporter,
      ...answers: unknown[]
    ): Promise<void> {
      const lent = { contributor, reporter, count: (this.#count += 1) };
      await played(this, "on workflow success", lent, answers);
      await super.onWorkflowSuccess(contributor, reporter, ...answers);
    }

    override async onWorkflowFailure(
      contributor: Contributor,
      reporter: HookReporter,
      ...answers: unknown[]
    ): Promise<void> {
      const lent = { contributor, reporter, count: (this.#count += 1) };
      await played(this, "on workflow failure", lent, answers);
      await super.onWorkflowFailure(contributor, reporter, ...answers);
    }
  };
}

function playing(
  name: string,
  script: PolicyScript,
  witness: Witness,
): Playing {
  return async (mock, hook, { contributor, reporter, count }, answers) => {
    witness.hooks.call(name, hook, mock);
    const hookScript = script.hooks.get(hook);
    if (hookScript !== undefined) {
      await hookActed(hookScript, {
        contributor,
        reporter,
        answers,
        count,
        kept: (step) => witness.kept(step),
      });
    }
  };
}
