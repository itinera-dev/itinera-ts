import { isDeepStrictEqual } from "node:util";
import { Then } from "@cucumber/cucumber";
import { None, type Option, Some } from "itinera/option";
import { json } from "../../../model.js";
import type { HookRequest } from "../../../model/policy.js";
import { holds } from "../../../unmet.js";
import type { World } from "../../../world.js";
import { requestAt } from "./calls.js";

/** Both sentences of data a hook received, from the step or from the workflow, as a value. */
Then<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" received (step data|data from the workflow) "([^"]*)" = (.+)$/,
  function (
    hook: string,
    policy: string,
    kind: string,
    key: string,
    value: string,
  ) {
    expectData(this, hook, policy, kind, key, Some(json(value)));
  },
);

Then<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" received (step data|data from the workflow) "([^"]*)" absent$/,
  function (hook: string, policy: string, kind: string, key: string) {
    expectData(this, hook, policy, kind, key, None);
  },
);

function expectData(
  world: World,
  hook: string,
  policy: string,
  kind: string,
  key: string,
  expected: Option<unknown>,
): void {
  const at = requestAt(world, hook, policy, (request) =>
    isDataUnder(request, kind, key),
  );
  const optional = "optional" in at.request && at.request.optional;
  const found = at.answers.map((answer) => optionOf(answer, optional));
  holds(
    found.some((received) => isDeepStrictEqual(received, expected)),
    `${hook} of "${policy}" to receive ${kind} "${key}" ${written(expected)}`,
    found.map(written).join(", "),
  );
}

function isDataUnder(request: HookRequest, kind: string, key: string): boolean {
  return request.kind === kind && "key" in request && request.key === key;
}

/** What a request was answered with, which itinera gives as an `Option` when it is optional. */
function optionOf(answer: unknown, optional: boolean): Option<unknown> {
  if (!optional) {
    return Some(answer);
  }
  return answer instanceof Some ? Some(answer.value) : None;
}

function written(received: Option<unknown>): string {
  return received.isSome() ? `= ${JSON.stringify(received.value)}` : "absent";
}
