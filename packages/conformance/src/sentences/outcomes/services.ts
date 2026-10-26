import { Then } from "@cucumber/cucumber";
import { Attempt, Option } from "itinera/unstable";
import { equalTo } from "../../equal.js";
import { ModelError } from "../../model.js";
import { dataUnder, type ProviderRequest } from "../../model/provider.js";
import { holds } from "../../unmet.js";
import type { World } from "../../world.js";

Then<World>(
  "the service provider {string} was called {int} times",
  function (provider: string, times: number) {
    const calls = this.witness.providers.callsTo(provider).length;
    holds(
      calls === times,
      `"${provider}" to be called ${String(times)} times`,
      `${String(calls)} calls`,
    );
  },
);

Then<World>(
  "step {string} was given the service {string} labelled {string} for attempt {int}",
  function (step: string, key: string, label: string, attempt: number) {
    const expected = { attempt, key, label };
    const lent = this.witness.lent(step);
    holds(
      lent.some(equalTo(expected)),
      `step "${step}" to be given ${JSON.stringify(expected)}`,
      JSON.stringify(lent),
    );
  },
);

Then<World>(
  "the service provider {string} received the step name {string}",
  function (provider: string, step: string) {
    const names = received(this, provider, ofKind("step name"));
    expectReceived(provider, "step name", step, names);
  },
);

Then<World>(
  "the service provider {string} received the attempt number {int}",
  function (provider: string, attempt: number) {
    const attempts = received(this, provider, ofKind("attempt number"));
    expectReceived(provider, "attempt number", attempt, attempts.map(numberOf));
  },
);

Then<World>(
  "the service provider {string} received the journey ID {string}",
  function (provider: string, id: string) {
    const ids = received(this, provider, ofKind("journey ID"));
    expectReceived(provider, "journey ID", id, ids);
  },
);

Then<World>(
  "the service provider {string} received data from the workflow {string} absent",
  function (provider: string, key: string) {
    const answers = received(this, provider, dataUnder(key));
    holds(
      answers.some(isAbsent),
      `"${provider}" to receive data from the workflow "${key}" absent`,
      JSON.stringify(answers),
    );
  },
);

function expectReceived(
  provider: string,
  what: string,
  expected: unknown,
  answers: readonly unknown[],
): void {
  holds(
    answers.includes(expected),
    `"${provider}" to receive the ${what} ${JSON.stringify(expected)}`,
    JSON.stringify(answers),
  );
}

/**
 * What every call of the provider received for its request that `matches`
 * finds, in order.
 *
 * @throws ModelError when the provider never makes that request.
 */
function received(
  world: World,
  provider: string,
  matches: (request: ProviderRequest) => boolean,
): readonly unknown[] {
  const { requests } = world.model.providers.provider(provider);
  const at = requests.findIndex(matches);
  if (at === -1) {
    throw new ModelError(
      `the service provider "${provider}" never makes that request`,
    );
  }
  const calls = world.witness.providers.callsTo(provider);
  return calls.map((answers) => answers[at]);
}

function ofKind(
  kind: ProviderRequest["kind"],
): (request: ProviderRequest) => boolean {
  return (request) => isOfKind(request, kind);
}

function isOfKind(
  request: ProviderRequest,
  kind: ProviderRequest["kind"],
): boolean {
  return request.kind === kind;
}

/** The number of an attempt itinera gave, or what it gave instead. */
function numberOf(answer: unknown): unknown {
  return answer instanceof Attempt ? answer.number : answer;
}

/** Whether an optional request was answered with nothing. */
function isAbsent(answer: unknown): boolean {
  return Option.isOption(answer) && answer.isNone();
}
