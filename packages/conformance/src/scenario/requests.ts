/**
 * The requests of a scenario's step or rescue step, as its builder takes
 * them.
 */
import { input, service } from "itinera/unstable";
import type { ServiceRequest } from "../model/provider.js";
import type { Input } from "../model/step.js";
import { serviceTypeOf } from "../services.js";
import { requestTypeOf } from "../tokens.js";

/** The request for a service the step's `run` makes. */
export function serviceOf({ key, type }: ServiceRequest) {
  return service<unknown>(key, serviceTypeOf(type));
}

/** The request for an input the step's constructor makes. */
export function inputOf({ key, type, optional }: Input) {
  return input(key, requestTypeOf(type, optional));
}
