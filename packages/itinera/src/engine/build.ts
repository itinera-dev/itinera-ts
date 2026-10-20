import type { Input, Request } from "../declaration/request.js";
import type { WorkflowInstance } from "../instance.js";
import { AbortReason } from "../journey.js";
import type { Attempt } from "../step.js";
import type { PlainValue } from "../value.js";
import { adapting, type DeclaredAdapter } from "../workflow/adapter.js";
import { adaptersOf } from "../workflow/descriptor.js";
import { adapted } from "./adapter.js";
import type { Buildable, Runs } from "./buildable.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { inOrder } from "./order.js";
import { byAdapter, byStep, requested } from "./request.js";
import { fromRescued, isOfRescued } from "./rescue/request.js";
import { servicesFor } from "./services.js";
import { JourneyAbortError } from "./signal.js";

/**
 * A step, or a rescue step, being built for an attempt of a journey of an
 * instance, with the input adapter attached to its name, if any, and the
 * values its requests found, by key, as a scripted run records them.
 */
interface Building {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly step: Buildable;
  readonly attempt: Attempt;
  readonly adapter: DeclaredAdapter | undefined;
  readonly found: Map<string, PlainValue>;
}

/**
 * A step, or a rescue step, built for an attempt, with the services lent to
 * its `run`.
 */
export interface BuiltStep {
  /** The step. */
  readonly made: Runs;
  /** The services its `run` requests, by key. */
  readonly services: ReadonlyMap<string, unknown>;
}

/**
 * The step, or rescue step, built for `attempt`: each of its constructor's
 * requests resolved in the order it declares them, then the services its
 * `run` requests, then its constructor called with what they were answered
 * with. Its inputs come through the input adapter attached to its own name,
 * and a rescue step's requests of the step it rescues from what that step's
 * failed attempt left. A scripted run records the attempt, with the values
 * its requests found, just before the constructor is called.
 *
 * @throws JourneyAbortError when resolving a request or a service aborts the
 * journey, or with `step could not be built` when its constructor fails.
 */
export async function built(
  journey: Journey,
  instance: WorkflowInstance,
  step: Buildable,
  attempt: Attempt,
): Promise<BuiltStep> {
  const building: Building = {
    journey,
    instance,
    step,
    attempt,
    adapter: adapting(adaptersOf(instance.descriptor), step.name),
    found: new Map(),
  };
  const needs = await inOrder(step.requests.needs, (request) =>
    need(building, request),
  );
  const services = await servicesFor(journey, instance, step, attempt);
  journey.script?.building(step.name, attempt, building.found);
  try {
    return { made: step.build(needs), services };
  } catch (error) {
    if (error instanceof JourneyAbortError) {
      throw error;
    }
    throw couldNotBeBuilt(building, error);
  }
}

async function need(building: Building, request: Request): Promise<unknown> {
  const { journey, step, attempt } = building;
  if (request.kind === "input") {
    return input(building, request);
  }
  if (step.rescued !== undefined && isOfRescued(request)) {
    if (request.kind === "fromRescuedStep") {
      foundUnder(building, request.key, step.rescued.contributed);
    }
    return fromRescued(journey, step.name, attempt, step.rescued, request);
  }
  throw couldNotBeBuilt(
    building,
    new TypeError(
      `the constructor of step ${step.name} requests @${request.kind}, which its constructor cannot request`,
    ),
  );
}

/**
 * The value of one input: from the step's input adapter, when it supplies
 * one, and otherwise from the data bag.
 */
async function input(building: Building, request: Input): Promise<unknown> {
  const { journey, instance, step, attempt, adapter } = building;
  if (adapter !== undefined) {
    const supplied = await adapted(journey, instance, adapter, {
      step: step.name,
      attempt,
      input: request,
    });
    if (supplied.isSome()) {
      building.found.set(request.key, supplied.value);
      return requested(
        journey,
        byAdapter(adapter.name, step.name, attempt),
        request.key,
        request.type,
        supplied.value,
      );
    }
  }
  foundUnder(building, request.key, journey.data);
  return requested(
    journey,
    byStep(step.name, attempt),
    request.key,
    request.type,
    journey.data.get(request.key),
  );
}

/** Keeps the value `values` hold under `key`, if any, as found under it. */
function foundUnder(
  { found }: Building,
  key: string,
  values: ReadonlyMap<string, PlainValue>,
): void {
  const value = values.get(key);
  if (value !== undefined) {
    found.set(key, value);
  }
}

function couldNotBeBuilt(
  { journey, step }: Building,
  error: unknown,
): JourneyAbortError {
  return journey.abort({
    reason: AbortReason.StepCouldNotBeBuilt,
    step: step.name,
    source: { kind: "step" },
    errorMessage: messageOf(error),
    error,
  });
}
