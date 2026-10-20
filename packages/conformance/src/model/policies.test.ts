import { describe, expect, it } from "vitest";
import { ModelError } from "./error.js";
import { Policies } from "./policies.js";

/** The policies of a scenario declaring the step policy `audit` with one hook. */
function auditing(): Policies {
  const policies = new Policies();
  policies.define("step", "audit", "on step success");
  return policies;
}

describe("the policies a scenario declares", () => {
  it("add each hook a sentence defines to the same policy, in order", () => {
    const policies = auditing();
    policies.define("step", "audit", "on step failure");
    expect([...policies.policy("audit").hooks.keys()]).toEqual([
      "on step success",
      "on step failure",
    ]);
  });

  it.each([
    [
      "a hook of the other kind of policy",
      (policies: Policies) => {
        policies.define("step", "audit", "on workflow success");
      },
      '"on workflow success" is not a hook of a step policy',
    ],
    [
      "a policy of the other kind under the same name",
      (policies: Policies) => {
        policies.define("workflow", "audit", "on workflow success");
      },
      'the policy "audit" is a step policy',
    ],
    [
      "a hook defined twice",
      (policies: Policies) => {
        policies.define("step", "audit", "on step success");
      },
      'the policy "audit" defines on step success already',
    ],
    [
      "a hook the policy does not define",
      (policies: Policies) => policies.hook("audit", "on step retry"),
      'the policy "audit" does not define on step retry',
    ],
    [
      "a policy never declared",
      (policies: Policies) => policies.policy("alarm"),
      'no policy "alarm" is declared',
    ],
    [
      "the workflow's policies stated twice",
      (policies: Policies) => {
        policies.attachToWorkflow(["notify"]);
        policies.attachToWorkflow(["notify"]);
      },
      "the workflow's policies are already stated",
    ],
    [
      "a role the workflow does not provide",
      (policies: Policies) => policies.role("notifier"),
      'the workflow provides no role "notifier"',
    ],
  ])("refuse %s, as an error in the case", (_, misuse, message) => {
    const policies = auditing();
    expect(() => {
      misuse(policies);
    }).toThrow(new ModelError(message));
  });

  it("gather the operations of each role the workflow provides", () => {
    const policies = auditing();
    policies.provide("notifier", "notify");
    policies.provide("notifier", "page");
    expect([...policies.role("notifier").operations]).toEqual([
      "notify",
      "page",
    ]);
  });
});
