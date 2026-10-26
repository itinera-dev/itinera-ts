import type { Request, Service } from "../declaration/request.js";
import type { StepName } from "../step.js";
import type { StepRequests } from "../step/declared.js";
import type { DeclaredProvider } from "./provider.js";

/**
 * The provider of `providers` that serves the step, or the rescue step,
 * named `step` for the service under `key`: the one of that key attached to
 * it, or else the one of that key attached to no step, or `undefined` when
 * neither exists.
 */
export function serving(
  providers: readonly DeclaredProvider[],
  step: StepName,
  key: string,
): DeclaredProvider | undefined {
  return (
    providers.find((provider) => isAttachedTo(provider, step, key)) ??
    providers.find((provider) => isUnattached(provider, key))
  );
}

function isAttachedTo(
  provider: DeclaredProvider,
  step: StepName,
  key: string,
): boolean {
  return provider.serviceKey === key && provider.steps?.includes(step) === true;
}

function isUnattached(provider: DeclaredProvider, key: string): boolean {
  return provider.serviceKey === key && provider.steps === undefined;
}

/**
 * The services a step, or a rescue step, requests, by key and type, in the
 * order of its `run`'s parameters, from what its constructor and its `run`
 * request.
 */
export function servicesOf(requests: StepRequests): readonly Service[] {
  return requests.run.filter(isService);
}

function isService(request: Request): request is Service {
  return request.kind === "service";
}
