import { Given } from "@cucumber/cucumber";
import { nonValue, scripted, caseType, type Level } from "../model.js";
import type { HookRequest, HookScript } from "../model/policy.js";
import type { World } from "../world.js";

function hookOf(world: World, hook: string, policy: string): HookScript {
  return world.model.policies.hook(policy, hook);
}

/** Every request a hook makes with no parameter, by the words after "requests the". */
const plainRequests = {
  "step name": { kind: "step name" },
  "failure reason": { kind: "failure reason", optional: false },
  "optional failure reason": { kind: "failure reason", optional: true },
  "failure cause": { kind: "failure cause" },
  "retry cause": { kind: "retry cause" },
  error: { kind: "error" },
  "attempt number": { kind: "attempt number" },
  "journey ID": { kind: "journey ID" },
} as const satisfies Readonly<Record<string, HookRequest>>;

Given<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" requests the (step name|failure reason|optional failure reason|failure cause|retry cause|error|attempt number|journey ID)$/,
  function (
    hook: string,
    policy: string,
    requested: keyof typeof plainRequests,
  ) {
    hookOf(this, hook, policy).requests.push(plainRequests[requested]);
  },
);

/** The four requests of data, from the step or from the workflow, required or optional. */
Given<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" requests (optional )?(step data|data from the workflow) "([^"]*)" of type (.+)$/,
  function (
    hook: string,
    policy: string,
    optional: string | null,
    kind: "step data" | "data from the workflow",
    key: string,
    type: string,
  ) {
    hookOf(this, hook, policy).requests.push({
      kind,
      key,
      type: caseType(type),
      optional: optional !== null,
    });
  },
);

Given<World>(
  "the hook {string} of policy {string} requests the role {string} and calls its operation {string}",
  function (hook: string, policy: string, role: string, operation: string) {
    const script = hookOf(this, hook, policy);
    script.requests.push({ kind: "role", role });
    script.actions.push({ kind: "call role", role, operation });
  },
);

Given<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" contributes "([^"]*)" = (.+)$/,
  function (hook: string, policy: string, key: string, value: string) {
    hookOf(this, hook, policy).actions.push({
      kind: "contribute",
      key,
      value: scripted(value),
    });
  },
);

Given<World>(
  "the hook {string} of policy {string} counts its calls and contributes the count as {string}",
  function (hook: string, policy: string, key: string) {
    hookOf(this, hook, policy).actions.push({ kind: "count calls", key });
  },
);

Given<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" changes the step data "([^"]*)" it received to (.+)$/,
  function (hook: string, policy: string, key: string, value: string) {
    hookOf(this, hook, policy).actions.push({
      kind: "change step data",
      key,
      value: scripted(value),
    });
  },
);

/** Both sentences of a hook setting global metadata, a value or a non-value. */
Given<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" sets the global metadata "([^"]*)" to (.+)$/,
  function (hook: string, policy: string, key: string, written: string) {
    hookOf(this, hook, policy).actions.push({
      kind: "set global metadata",
      key,
      value: written === "a non-value" ? nonValue : scripted(written),
    });
  },
);

Given<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" emits journey_(info|warning|error) "([^"]*)"$/,
  function (hook: string, policy: string, level: Level, message: string) {
    hookOf(this, hook, policy).actions.push({ kind: "emit", level, message });
  },
);

Given<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" uses the kept contributor and step reporter of step "([^"]*)" to contribute "([^"]*)" = (.+) and emit step_info "([^"]*)"$/,
  function (
    hook: string,
    policy: string,
    step: string,
    key: string,
    value: string,
    message: string,
  ) {
    hookOf(this, hook, policy).actions.push({
      kind: "use kept handles",
      step,
      key,
      value: scripted(value),
      message,
    });
  },
);

Given<World>(
  "the hook {string} of policy {string} returns FinishWorkflow",
  function (hook: string, policy: string) {
    hookOf(this, hook, policy).ending = { kind: "finish workflow" };
  },
);

Given<World>(
  "the hook {string} of policy {string} returns FailWorkflow with code {string}",
  function (hook: string, policy: string, code: string) {
    hookOf(this, hook, policy).ending = { kind: "fail workflow", code };
  },
);

Given<World>(
  "the hook {string} of policy {string} throws",
  function (hook: string, policy: string) {
    hookOf(this, hook, policy).ending = { kind: "fail" };
  },
);

Given<World>(
  "the hook {string} of policy {string} fails with {string}",
  function (hook: string, policy: string, message: string) {
    hookOf(this, hook, policy).ending = { kind: "fail", message };
  },
);
