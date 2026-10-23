/**
 * The rescue step of a scenario's step, put together with its builder from
 * a class of rescue step mocks the witness makes.
 */
import { contributor } from "itinera/journey";
import {
  error,
  failureReason,
  fromRescuedStep,
  type RescueStepBuilder,
  stepReporter,
} from "itinera/step";
import type { RescueRequest } from "../model/step.js";
import type { Model } from "../model.js";
import { requestTypeOf } from "../tokens.js";
import type { ActingRescueClass, Witness } from "../witness.js";
import { actingOf } from "./actions.js";
import { rescueMockScriptOf } from "./mock.js";
import { inputOf, serviceOf } from "./requests.js";

/**
 * The builder of the rescue step `rescue`, a rescue step mock the witness
 * keeps, whose constructor requests its inputs, then what it requests of the
 * step it rescues.
 */
export function rescueStepOf(
  rescue: string,
  model: Model,
  witness: Witness,
): RescueStepBuilder<ActingRescueClass> {
  const script = model.step(rescue);
  return witness
    .rescueClassOf(
      rescue,
      rescueMockScriptOf(script),
      actingOf(script),
      script.keepsHandles,
      script.services,
    )
    .builder()
    .needs(
      ...script.inputs.map(inputOf),
      ...script.rescueRequests.map(rescueRequestOf),
    )
    .run(contributor(), stepReporter(), ...script.services.map(serviceOf));
}

function rescueRequestOf(request: RescueRequest) {
  switch (request.kind) {
    case "data":
      return fromRescuedStep(
        request.input.key,
        requestTypeOf(request.input.type, request.input.optional),
      );
    case "failure reason":
      return failureReason();
    case "error":
      return error();
  }
}
