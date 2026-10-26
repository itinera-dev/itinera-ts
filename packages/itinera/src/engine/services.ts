import type { Service } from "../declaration/request.js";
import type { WorkflowInstance } from "../instance.js";
import { AbortReason } from "../journey.js";
import { serving, servicesOf } from "../service/serving.js";
import type { Attempt } from "../step.js";
import { providersOf } from "../workflow/descriptor.js";
import type { Buildable } from "./buildable.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { inOrder } from "./order.js";
import { providedBy } from "./provider.js";

/**
 * A step, or a rescue step, being built for an attempt of a journey of an
 * instance.
 */
interface Building {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly step: Buildable;
  readonly attempt: Attempt;
}

/**
 * The services the step, or rescue step, requests, lent for `attempt`, by
 * key, resolved in the order its `run` declares them: for each, the
 * instance of journey scope its provider made earlier in the journey, or
 * else a new one from the provider serving its name, which a provider of
 * journey scope keeps for the rest of the journey.
 *
 * @throws JourneyAbortError when calling a provider aborts the journey.
 */
export async function servicesFor(
  journey: Journey,
  instance: WorkflowInstance,
  step: Buildable,
  attempt: Attempt,
): Promise<ReadonlyMap<string, unknown>> {
  const building: Building = { journey, instance, step, attempt };
  const lent = await inOrder(servicesOf(step.requests), (service) =>
    lentFor(building, service),
  );
  return new Map(lent);
}

async function lentFor(
  { journey, instance, step, attempt }: Building,
  { key }: Service,
): Promise<[string, unknown]> {
  const provider = serving(providersOf(instance.descriptor), step.name, key);
  if (provider === undefined) {
    const error = new TypeError(
      `no service provider serves step ${step.name} under the key ${key}`,
    );
    throw journey.abort({
      reason: AbortReason.StepCouldNotBeBuilt,
      step: step.name,
      source: { kind: "step" },
      errorMessage: messageOf(error),
      error,
    });
  }
  const { kept } = journey;
  if (provider.scope === "journey" && kept.has(provider.name)) {
    return [key, kept.get(provider.name)];
  }
  const source = {
    kind: "provider",
    provider: provider.name,
    step: step.name,
    attempt,
  } as const;
  const made = await providedBy(journey, instance, provider, source, key);
  if (provider.scope === "journey") {
    kept.set(provider.name, made);
  }
  return [key, made];
}
