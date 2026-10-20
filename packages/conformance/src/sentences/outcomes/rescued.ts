/**
 * The Then sentences of what a rescue step received from the step it
 * rescues: data its failed attempt contributed, its failure's reason and its
 * error.
 */
import { isDeepStrictEqual } from "node:util";
import { Then } from "@cucumber/cucumber";
import { None, type Option, Some } from "itinera/option";
import { json, ModelError } from "../../model.js";
import type { RescueRequest, StepScript } from "../../model/step.js";
import { holds } from "../../unmet.js";
import type { Mock } from "../../witness.js";
import type { World } from "../../world.js";
import { receivedBy, written } from "./inputs.js";

Then<World>(
  /^step "([^"]*)" was built with rescued step data "([^"]*)" = (.+)$/,
  function (step: string, key: string, value: string) {
    expectRescuedData(this, step, key, Some(json(value)));
  },
);

Then<World>(
  "step {string} was built with rescued step data {string} absent",
  function (step: string, key: string) {
    expectRescuedData(this, step, key, None);
  },
);

Then<World>(
  /^step "([^"]*)" received the failure reason with code "([^"]*)", message "([^"]*)" and details (.+)$/,
  function (step: string, code: string, message: string, details: string) {
    const expected = { code, message, details: json(details) };
    const found = receivedOf(this, step, isFailureReason);
    holds(
      found.some((received) => isDeepStrictEqual(received, expected)),
      `"${step}" given the failure reason ${JSON.stringify(expected)}`,
      found.map(described).join(", "),
    );
  },
);

Then<World>(
  "step {string} received the error with the message {string}",
  function (step: string, message: string) {
    const found = receivedOf(this, step, isError);
    holds(
      found.map(messageOf).includes(message),
      `"${step}" given an error with the message "${message}"`,
      found.map(messageOf).join(", "),
    );
  },
);

/**
 * Holds when one of the rescue steps built was given what is expected for
 * the data from the step it rescues under `key`.
 */
function expectRescuedData(
  world: World,
  step: string,
  key: string,
  expected: Option<unknown>,
): void {
  const script = world.model.rescueStep(step);
  const at = script.rescueRequests.findIndex((request) =>
    isDataKeyed(request, key),
  );
  const request = script.rescueRequests[at];
  if (request?.kind !== "data") {
    throw new ModelError(
      `step "${step}" requests no rescued step data "${key}"`,
    );
  }
  const position = script.inputs.length + at;
  const found = world.witness
    .built(step)
    .map((made) => receivedBy(made, request.input, position));
  holds(
    found.some((received) => isDeepStrictEqual(received, expected)),
    `"${step}" built with the rescued step data "${key}" ${written(expected)}`,
    found.map(written).join(", "),
  );
}

/**
 * What each rescue step built under the name was given for its first
 * request of the step it rescues that `wanted` picks.
 */
function receivedOf(
  world: World,
  step: string,
  wanted: (request: RescueRequest) => boolean,
): readonly unknown[] {
  const script: StepScript = world.model.rescueStep(step);
  const at = script.rescueRequests.findIndex(wanted);
  if (at === -1) {
    throw new ModelError(`step "${step}" does not request it`);
  }
  const position = script.inputs.length + at;
  return world.witness.built(step).map((made) => inputAt(made, position));
}

function inputAt(made: Mock, at: number): unknown {
  return made.inputs[at];
}

function isDataKeyed(request: RescueRequest, key: string): boolean {
  return request.kind === "data" && request.input.key === key;
}

function isFailureReason(request: RescueRequest): boolean {
  return request.kind === "failure reason";
}

function isError(request: RescueRequest): boolean {
  return request.kind === "error";
}

function messageOf(received: unknown): string {
  return received instanceof Error ? received.message : String(received);
}

function described(received: unknown): string {
  return JSON.stringify(received);
}
