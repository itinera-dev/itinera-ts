/**
 * The workflows the features under `tests/fixtures/features` drive, written by
 * hand as an application writes them, declared with the decorators alone,
 * each named by a scenario instead of declared sentence by sentence.
 */
import type { WorkflowInstance } from "itinera/instance";
import type { Value } from "itinera/value";
import type { ListedStep } from "itinera/workflow";
import { Couriers } from "./fixture/courier.js";
import { Delivery } from "./fixture/delivery.js";
import { Payment } from "./fixture/payment.js";
import { Warehouse } from "./fixture/warehouse.js";
import { journeysOf, type Runs } from "./journeys.js";
import { ModelError } from "./model/error.js";
import type { Model } from "./model.js";
import { executorOf } from "./executor.js";
import type { Recorders } from "./recorders.js";
import { asGiven } from "./scenario.js";

/** The names the scenarios give the hand-written workflows. */
export const fixtures = [
  "payment",
  "delivery",
  "warehouse",
  "courier",
] as const;

/** A hand-written workflow, by the name the scenarios give it. */
export type Fixture = (typeof fixtures)[number];

/** What the runner asks of a hand-written workflow. */
interface HandWritten {
  /** Its listing, as its class gives it. */
  readonly listing: () => readonly ListedStep[];
  /** A new instance of it, with the initial data. */
  readonly instance: (data: [string, Value][]) => WorkflowInstance;
}

const handWritten: Readonly<Record<Fixture, HandWritten>> = {
  payment: {
    listing: () => Payment.listing(),
    instance: (data) => Payment.build("corner").instance(data),
  },
  delivery: {
    listing: () => Delivery.listing(),
    instance: (data) => Delivery.build().instance(data),
  },
  warehouse: {
    listing: () => Warehouse.listing(),
    instance: (data) => Warehouse.build().instance(data),
  },
  courier: {
    listing: () => Couriers.listing(),
    instance: (data) => Couriers.build().instance(data),
  },
};

/** The hand-written workflow of the name. */
export function fixtureNamed(name: string): Fixture {
  const found = fixtures.find(named(name));
  if (found === undefined) {
    throw new ModelError(`no hand-written workflow is named "${name}"`);
  }
  return found;
}

function named(name: string): (fixture: Fixture) => boolean {
  return (fixture) => fixture === name;
}

/** The listing of the hand-written workflow. */
export function fixtureListing(fixture: Fixture): readonly ListedStep[] {
  return handWritten[fixture].listing();
}

/**
 * Runs `times` journeys of the hand-written workflow on the executor the
 * scenario's dispatching gives, each with a new instance holding the
 * scenario's initial data.
 */
export async function ranFixture(
  fixture: Fixture,
  model: Model,
  recorders: Recorders,
  times: number,
): Promise<Runs> {
  const { instance } = handWritten[fixture];
  const data = model.initialData.map(asGiven);
  return journeysOf(executorOf(model.dispatching, recorders), times, () =>
    instance(data),
  );
}
