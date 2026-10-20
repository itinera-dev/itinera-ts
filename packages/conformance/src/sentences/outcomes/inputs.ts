import { isDeepStrictEqual } from "node:util";
import { Then } from "@cucumber/cucumber";
import { None, type Option, Some } from "itinera/option";
import { json, ModelError } from "../../model.js";
import type { Input } from "../../model/step.js";
import { holds } from "../../unmet.js";
import type { Mock } from "../../witness.js";
import type { World } from "../../world.js";

Then<World>(
  /^step "([^"]*)" was built with input "([^"]*)" = (.+)$/,
  function (step: string, key: string, value: string) {
    expectBuilt(this, step, this.witness.built(step), key, Some(json(value)));
  },
);

Then<World>(
  "step {string} was built with input {string} absent",
  function (step: string, key: string) {
    expectBuilt(this, step, this.witness.built(step), key, None);
  },
);

Then<World>(
  /^step "([^"]*)" was built for attempt (\d+) with input "([^"]*)" = (.+)$/,
  function (step: string, attempt: string, key: string, value: string) {
    const at = Number(attempt) - 1;
    if (at < 0) {
      throw new ModelError(`step "${step}" has no attempt ${attempt}`);
    }
    expectBuilt(
      this,
      step,
      this.witness.built(step).slice(at, at + 1),
      key,
      Some(json(value)),
    );
  },
);

/**
 * Holds when one of the steps built was given what is expected for the
 * input of `key`.
 */
function expectBuilt(
  world: World,
  step: string,
  built: readonly Mock[],
  key: string,
  expected: Option<unknown>,
): void {
  const { inputs } = world.model.step(step);
  const at = inputs.findIndex((input) => isKeyed(input, key));
  const input = inputs[at];
  if (input === undefined) {
    throw new ModelError(`step "${step}" requests no input "${key}"`);
  }
  const found = built.map((made) => receivedBy(made, input, at));
  holds(
    found.some((received) => isDeepStrictEqual(received, expected)),
    `"${step}" built with the input "${key}" ${written(expected)}`,
    found.map(written).join(", "),
  );
}

function isKeyed(input: Input, key: string): boolean {
  return input.key === key;
}

/**
 * What the step was given for the input at `at`, which itinera gives as an
 * `Option` when the input is optional.
 */
export function receivedBy(
  made: Mock,
  input: Input,
  at: number,
): Option<unknown> {
  const given = made.inputs[at];
  if (!input.optional) {
    return Some(given);
  }
  return given instanceof Some ? Some(given.value) : None;
}

/** What a step received, as an unmet sentence tells it. */
export function written(received: Option<unknown>): string {
  return received.isSome() ? `= ${JSON.stringify(received.value)}` : "absent";
}
