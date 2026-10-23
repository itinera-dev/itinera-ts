import type { Input, Request } from "../declaration/request.js";
import type { WorkflowInstance } from "../instance.js";
import { AbortReason } from "../journey.js";
import type { Attempt, Step, StepDescriptor } from "../step.js";
import { requestsOfDescribed } from "../step/descriptor.js";
import { adapting, type DeclaredAdapter } from "../workflow/adapter.js";
import { adaptersOf } from "../workflow/descriptor.js";
import { adapted } from "./adapter.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { inOrder } from "./order.js";
import { byAdapter, byStep, requested } from "./request.js";
import { JourneyAbortError } from "./signal.js";

/** A step being built for an attempt of a journey of an instance. */
interface Building {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly step: StepDescriptor;
  readonly attempt: Attempt;
  readonly adapter: DeclaredAdapter | undefined;
}

/**
 * The step built for `attempt`: each of its constructor's requests resolved
 * in the order it declares them, then its constructor called with them.
 *
 * @throws JourneyAbortError when resolving a request aborts the journey, or
 * with `step could not be built` when its constructor fails.
 */
export async function built(
  journey: Journey,
  instance: WorkflowInstance,
  step: StepDescriptor,
  attempt: Attempt,
): Promise<Step> {
  const building: Building = {
    journey,
    instance,
    step,
    attempt,
    adapter: adapting(adaptersOf(instance.descriptor), step.name),
  };
  const needs = await inOrder(requestsOfDescribed(step).needs, (request) =>
    need(building, request),
  );
  try {
    return step.build(needs);
  } catch (error) {
    if (error instanceof JourneyAbortError) {
      throw error;
    }
    throw couldNotBeBuilt(building, error);
  }
}

async function need(building: Building, request: Request): Promise<unknown> {
  if (request.kind !== "input") {
    throw couldNotBeBuilt(
      building,
      new TypeError(
        `the constructor of step ${building.step.name} requests @${request.kind}, which a step's constructor cannot request`,
      ),
    );
  }
  return input(building, request);
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
      return requested(
        journey,
        byAdapter(adapter.name, step.name, attempt),
        request.key,
        request.type,
        supplied.value,
      );
    }
  }
  return requested(
    journey,
    byStep(step.name, attempt),
    request.key,
    request.type,
    journey.data.get(request.key),
  );
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
