import { describe, expect, it } from "vitest";
import type { Role } from "./model/policy.js";
import { isPerformer, Roles } from "./roles.js";

/** The roles of a workflow providing `notifier`, whose `page` throws. */
function notifier(): Roles {
  const role: Role = {
    operations: new Set(["notify", "page"]),
    failing: new Set(["page"]),
  };
  return new Roles(new Map([["notifier", role]]));
}

describe("the roles a scenario's workflow provides", () => {
  it("count every call of an operation, in every journey", () => {
    const roles = notifier();
    roles.perform("notifier", "notify");
    roles.perform("notifier", "notify");
    expect(roles.called("notifier", "notify")).toBe(2);
  });

  it("count a call of an operation that throws, then throw", () => {
    const roles = notifier();
    expect(() => {
      roles.perform("notifier", "page");
    }).toThrow('the operation "page" of the role "notifier" failed');
    expect(roles.called("notifier", "page")).toBe(1);
  });

  it("throw on an operation the workflow does not provide, counting nothing", () => {
    const roles = notifier();
    expect(() => {
      roles.perform("auditor", "notify");
    }).toThrow(
      'the workflow provides no operation "notify" of the role "auditor"',
    );
    expect(roles.called("auditor", "notify")).toBe(0);
  });
});

describe("isPerformer", () => {
  it.each([
    ["an object with perform", { perform: () => undefined }, true],
    ["an object without perform", {}, false],
    ["nothing", undefined, false],
  ])("tells whether a role received is the workflow: %s", (_, received, is) => {
    expect(isPerformer(received)).toBe(is);
  });
});
