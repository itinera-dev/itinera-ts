import { Given } from "@cucumber/cucumber";
import type { PolicyKind } from "../model/policy.js";
import type { World } from "../world.js";

/** Both "defines the hook" sentences, of a step policy and of a workflow policy. */
Given<World>(
  /^a (step|workflow) policy "([^"]*)" defines the hook "([^"]*)"$/,
  function (kind: PolicyKind, policy: string, hook: string) {
    this.model.policies.define(kind, policy, hook);
  },
);

Given<World>(
  "step {string} has the policies {names}",
  function (step: string, policies: string[]) {
    this.model.step(step).policies = policies;
  },
);

Given<World>(
  "the workflow has the policies {names}",
  function (policies: string[]) {
    this.model.policies.attachToWorkflow(policies);
  },
);

Given<World>(
  "the policy {string} fails when it is built",
  function (policy: string) {
    this.model.policies.policy(policy).buildFailure =
      `the policy "${policy}" could not be built`;
  },
);

Given<World>(
  "the policy {string} fails with {string} when it is built",
  function (policy: string, message: string) {
    this.model.policies.policy(policy).buildFailure = message;
  },
);

Given<World>(
  "the workflow provides the role {string} with the operation {string}",
  function (role: string, operation: string) {
    this.model.policies.provide(role, operation);
  },
);

Given<World>(
  "the operation {string} of the role {string} throws",
  function (operation: string, role: string) {
    this.model.policies.role(role).failing.add(operation);
  },
);
