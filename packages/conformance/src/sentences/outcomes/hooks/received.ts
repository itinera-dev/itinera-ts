import { isDeepStrictEqual } from "node:util";
import { Then } from "@cucumber/cucumber";
import { None, type Option, Some } from "itinera/option";
import { Attempt } from "itinera/step";
import { equalTo } from "../../../equal.js";
import { json } from "../../../model.js";
import type { HookRequest } from "../../../model/policy.js";
import { holds } from "../../../unmet.js";
import type { World } from "../../../world.js";
import { requestAt } from "./calls.js";

Then<World>(
  "the hook {string} of policy {string} received the cause {string}",
  function (hook: string, policy: string, cause: string) {
    expectAnswer(
      this,
      hook,
      policy,
      isCause,
      `the cause "${cause}"`,
      equalTo(cause),
    );
  },
);

function isCause(request: HookRequest): boolean {
  return request.kind === "failure cause" || request.kind === "retry cause";
}

Then<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" received the failure reason with code "([^"]*)", message "([^"]*)" and details (.+)$/,
  function (
    hook: string,
    policy: string,
    code: string,
    message: string,
    details: string,
  ) {
    const expected = { code, message, details: json(details) };
    expectAnswer(
      this,
      hook,
      policy,
      isFailureReason,
      `the failure reason ${JSON.stringify(expected)}`,
      theReason(expected),
    );
  },
);

Then<World>(
  "the hook {string} of policy {string} received no failure reason",
  function (hook: string, policy: string) {
    expectAnswer(
      this,
      hook,
      policy,
      isFailureReason,
      "no failure reason",
      hasNoReason,
    );
  },
);

function isFailureReason(request: HookRequest): boolean {
  return request.kind === "failure reason";
}

function theReason(expected: unknown): (found: unknown) => boolean {
  return (found) => isTheReason(found, expected);
}

function isTheReason(found: unknown, expected: unknown): boolean {
  return isDeepStrictEqual(reasonOf(found), Some(expected));
}

function hasNoReason(found: unknown): boolean {
  return reasonOf(found).isNone();
}

/** The failure reason a hook received, optional or not, as plain data. */
function reasonOf(found: unknown): Option<unknown> {
  const reason: unknown = found instanceof Some ? found.value : found;
  return reason === None ? None : Some(reason);
}

Then<World>(
  "the hook {string} of policy {string} received an error",
  function (hook: string, policy: string) {
    expectAnswer(this, hook, policy, isError, "an error", isSomething);
  },
);

Then<World>(
  "the hook {string} of policy {string} received the error with the message {string}",
  function (hook: string, policy: string, message: string) {
    expectAnswer(
      this,
      hook,
      policy,
      isError,
      `the error "${message}"`,
      errorWith(message),
    );
  },
);

function isError(request: HookRequest): boolean {
  return request.kind === "error";
}

function errorWith(message: string): (found: unknown) => boolean {
  return (found) => isErrorWith(found, message);
}

function isErrorWith(found: unknown, message: string): boolean {
  return found instanceof Error && found.message === message;
}

function isSomething(found: unknown): boolean {
  return found !== undefined && found !== null;
}

Then<World>(
  "the hook {string} of policy {string} received the step name {string}",
  function (hook: string, policy: string, step: string) {
    expectAnswer(
      this,
      hook,
      policy,
      kindOf("step name"),
      `the step name "${step}"`,
      equalTo(step),
    );
  },
);

Then<World>(
  /^the hook "([^"]*)" of policy "([^"]*)" received the attempt number (\d+)$/,
  function (hook: string, policy: string, attempt: string) {
    expectAnswer(
      this,
      hook,
      policy,
      kindOf("attempt number"),
      `the attempt number ${attempt}`,
      attemptNumbered(Number(attempt)),
    );
  },
);

Then<World>(
  "the hook {string} of policy {string} received the journey ID {string}",
  function (hook: string, policy: string, journeyId: string) {
    expectAnswer(
      this,
      hook,
      policy,
      kindOf("journey ID"),
      `the journey ID "${journeyId}"`,
      equalTo(journeyId),
    );
  },
);

function attemptNumbered(number: number): (found: unknown) => boolean {
  return (found) => isAttemptNumbered(found, number);
}

function isAttemptNumbered(found: unknown, number: number): boolean {
  return found instanceof Attempt && found.number === number;
}

function kindOf(kind: HookRequest["kind"]): (request: HookRequest) => boolean {
  return (request) => isOfKind(request, kind);
}

function isOfKind(request: HookRequest, kind: HookRequest["kind"]): boolean {
  return request.kind === kind;
}

/** Holds when, on at least one call, the hook's request was answered as `matches` says. */
function expectAnswer(
  world: World,
  hook: string,
  policy: string,
  request: (request: HookRequest) => boolean,
  expected: string,
  matches: (found: unknown) => boolean,
): void {
  const { answers } = requestAt(world, hook, policy, request);
  holds(
    answers.some(matches),
    `${hook} of "${policy}" to receive ${expected}`,
    answers.map(String).join(", ") || "no call",
  );
}
