/** The sentences of scripted runs, and of the mistakes that stop a test. */
import { isDeepStrictEqual } from "node:util";
import { type DataTable, Given, Then, When } from "@cucumber/cucumber";
import { type AttemptRecord, type Mistake, TestMistake } from "itinera/testing";
import { json, rows } from "../model.js";
import { ModelError } from "../model/error.js";
import type { Input, RescueRequest } from "../model/step.js";
import type { Row } from "../model/table.js";
import { tokenOf } from "../tokens.js";
import { holds, Unmet } from "../unmet.js";
import type { World } from "../world.js";

Given<World>("the script says:", function (table: DataTable) {
  this.model.testing.says(rows(table));
});

Given<World>("the script ensures every step is scripted", function () {
  this.model.testing.ensureAll();
});

Given<World>(
  "step {string} declares no contributor and no reporter",
  function (step: string) {
    this.model.step(step).declaresHandles = false;
  },
);

When<World>("the workflow runs with the script", async function () {
  await this.runScripted();
});

Then<World>(
  "the test stopped before the journey, naming:",
  function (table: DataTable) {
    const expected = rows(table).map(namedMistake);
    const { problems } = this.tested.mistake;
    const named = problems.map(namedBy);
    holds(
      eachMatchedOnce(named, expected),
      `the test to stop naming ${JSON.stringify(expected)}`,
      JSON.stringify(named),
    );
  },
);

Then<World>(
  /^the scripted run's record of step "([^"]*)" holds the attempts (\d+(?:, \d+)*)$/,
  function (step: string, attempts: string) {
    expectAttempts(this, step, attempts.split(", ").map(Number));
  },
);

Then<World>(
  "the scripted run's record of step {string} holds no attempt",
  function (step: string) {
    expectAttempts(this, step, []);
  },
);

Then<World>(
  /^attempt (\d+) of step "([^"]*)" in the scripted run's record read the (input|rescued step data) "([^"]*)" = (.*)$/,
  function (
    attempt: string,
    step: string,
    kind: "input" | "rescued step data",
    key: string,
    value: string,
  ) {
    const input = requested(this, step, kind, key);
    const read = recordOf(this, step, Number(attempt)).input(
      key,
      tokenOf(input.type),
    );
    const expected = json(value);
    holds(
      read.kind === "present" && isDeepStrictEqual(read.value, expected),
      `attempt ${attempt} of "${step}" to read "${key}" = ${value}`,
      JSON.stringify(read),
    );
  },
);

Then<World>(
  /^reading the scripted run's record of step "([^"]*)" stops the test as the mistake "([^"]*)"$/,
  function (step: string, mistake: string) {
    const named = problemsReading(this, step).map(namedBy);
    holds(
      eachMatchedOnce(named, [{ mistake, step }]),
      `reading the record of "${step}" to stop the test as "${mistake}"`,
      JSON.stringify(named),
    );
  },
);

Then<World>(
  /^reading attempt (\d+) of step "([^"]*)" in the scripted run's record reads nothing$/,
  function (attempt: string, step: string) {
    const read = this.tested.scriptedRun.step(step).attempt(Number(attempt));
    holds(
      read.isNone(),
      `attempt ${attempt} of "${step}" in the record to read nothing`,
      JSON.stringify(read),
    );
  },
);

/** The problems of the mistake that reading the record of the step stopped the test with. */
function problemsReading(world: World, step: string): readonly Mistake[] {
  try {
    world.tested.scriptedRun.step(step);
  } catch (error) {
    if (error instanceof TestMistake) {
      return error.problems;
    }
    throw error;
  }
  throw new Unmet(
    `expected reading the record of "${step}" to stop the test; it did not`,
  );
}

/** A mistake as a row of the table names it: its kind, and the step, attempt and provider given. */
interface Named {
  readonly mistake: string;
  readonly step?: string;
  readonly attempt?: number;
  readonly provider?: string;
}

function namedMistake(row: Row): Named {
  const step = row.optional("step");
  const attempt = row.optional("attempt");
  const provider = row.optional("provider");
  return {
    mistake: row.required("mistake"),
    ...(step === undefined ? {} : { step }),
    ...(attempt === undefined ? {} : { attempt: Number(attempt) }),
    ...(provider === undefined ? {} : { provider }),
  };
}

function namedBy(mistake: Mistake): Named {
  return { mistake: mistake.kind, ...mistake };
}

/** Whether each mistake reported matches one row, and each row one mistake. */
function eachMatchedOnce(
  named: readonly Named[],
  expected: readonly Named[],
): boolean {
  return (
    named.length === expected.length &&
    expected.reduce(leftUnmatched, [...named]) !== undefined
  );
}

/** The mistakes left once one matching the row is taken, or none when none matches. */
function leftUnmatched(
  left: readonly Named[] | undefined,
  expected: Named,
): readonly Named[] | undefined {
  const at = left?.findIndex(matching(expected)) ?? -1;
  return at === -1 ? undefined : left?.filter(notAt(at));
}

function notAt(at: number): (_: Named, index: number) => boolean {
  return (_, index) => index !== at;
}

function matching(expected: Named): (found: Named) => boolean {
  return (found) => matches(found, expected);
}

/** Whether a mistake reported names what a row does: its kind, and each part the row gives. */
function matches(found: Named, expected: Named): boolean {
  return (
    found.mistake === expected.mistake &&
    (expected.step === undefined || found.step === expected.step) &&
    (expected.attempt === undefined || found.attempt === expected.attempt) &&
    (expected.provider === undefined || found.provider === expected.provider)
  );
}

function expectAttempts(
  world: World,
  step: string,
  expected: readonly number[],
): void {
  const attempts = world.tested.scriptedRun.step(step).attempts.map(numberOf);
  holds(
    isDeepStrictEqual(attempts, expected),
    `the record of "${step}" to hold the attempts ${JSON.stringify(expected)}`,
    JSON.stringify(attempts),
  );
}

function numberOf(record: AttemptRecord): number {
  return record.attempt.number;
}

function recordOf(world: World, step: string, attempt: number): AttemptRecord {
  const record = world.tested.scriptedRun.step(step).attempt(attempt);
  if (record.isNone()) {
    throw new Unmet(
      `expected attempt ${String(attempt)} in the record of "${step}"; it holds none`,
    );
  }
  return record.value;
}

/** The input, or the data a rescue step requests of the step it rescues, under the key. */
function requested(
  world: World,
  step: string,
  kind: "input" | "rescued step data",
  key: string,
): Input {
  const script = world.model.step(step);
  const found =
    kind === "input"
      ? script.inputs.find(keyed(key))
      : script.rescueRequests.flatMap(dataInput).find(keyed(key));
  if (found === undefined) {
    throw new ModelError(`step "${step}" requests no ${kind} "${key}"`);
  }
  return found;
}

function keyed(key: string): (input: Input) => boolean {
  return (input) => input.key === key;
}

function dataInput(request: RescueRequest): Input[] {
  return request.kind === "data" ? [request.input] : [];
}
