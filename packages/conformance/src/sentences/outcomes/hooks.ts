import { isDeepStrictEqual } from "node:util";
import { type DataTable, Then } from "@cucumber/cucumber";
import type { Event } from "itinera/event";
import { type Row, rows } from "../../model.js";
import { expectOfStream, holds } from "../../unmet.js";
import type { Called } from "../../witness/hooks.js";
import type { World } from "../../world.js";
import { callsOf } from "./hooks/calls.js";

Then<World>(
  "the hook {string} of policy {string} was not called",
  function (hook: string, policy: string) {
    const calls = callsOf(this, hook, policy);
    holds(
      calls.length === 0,
      `${hook} of "${policy}" not called`,
      `${String(calls.length)} calls`,
    );
  },
);

Then<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" was called (\d+) times?$/,
  function (hook: string, policy: string, times: string) {
    const calls = callsOf(this, hook, policy);
    holds(
      calls.length === Number(times),
      `${hook} of "${policy}" called ${times} times`,
      `${String(calls.length)} calls`,
    );
  },
);

Then<World>(
  "the hooks were called in this order:",
  function (table: DataTable) {
    const expected = rows(table).map(policyAndHook);
    const found = this.witness.hooks.calls.map(writtenCall);
    holds(
      isDeepStrictEqual(found, expected),
      `the hooks called in the order ${JSON.stringify(expected)}`,
      JSON.stringify(found),
    );
  },
);

function policyAndHook(row: Row): string {
  return `${row.required("hook")} of ${row.required("policy")}`;
}

function writtenCall({ policy, hook }: Called): string {
  return `${hook} of ${policy}`;
}

Then<World>(
  "the result names the step {string} whose hook failed the journey, with the code {string}",
  function (step: string, code: string) {
    const { status } = this.result;
    const events = this.stream();
    expectOfStream(
      status.kind === "failed" &&
        status.failure.cause === "FailWorkflow" &&
        status.failure.reason.code === code &&
        events.some((event) => isFailedAt(event, step)),
      `a journey failed by FailWorkflow with the code "${code}", whose journey_failed names "${step}"`,
      events,
    );
  },
);

function isFailedAt(event: Event, step: string): boolean {
  return event.kind === "journey_failed" && event.step === step;
}

Then<World>(
  "the contribution of {string} is recorded as made by the hook {string} of policy {string}",
  function (key: string, hook: string, policy: string) {
    const events = this.stream();
    expectOfStream(
      events.some((event) => isCommittedBy(event, key, hook, policy)),
      `a contribution_committed of "${key}" made by ${hook} of "${policy}"`,
      events,
    );
  },
);

function isCommittedBy(
  event: Event,
  key: string,
  hook: string,
  policy: string,
): boolean {
  return (
    event.kind === "contribution_committed" &&
    event.key === key &&
    (event.source.kind === "step hook" ||
      event.source.kind === "workflow hook") &&
    event.source.hook === hook &&
    event.source.policy === policy
  );
}

Then<World>(
  /^the operation "([^"]*)" of the role "([^"]*)" was called (\d+) times?$/,
  function (operation: string, role: string, times: string) {
    const called = this.witness.roles.called(role, operation);
    holds(
      called === Number(times),
      `the operation "${operation}" of "${role}" called ${times} times`,
      `${String(called)} calls`,
    );
  },
);
