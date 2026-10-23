/**
 * The service types the cases name, `labeller` and `meter`, and the
 * runner's own implementations of them.
 */
import { serviceType, type ServiceType } from "itinera/service";
import type { Implementation, ServiceTypeName } from "./model/provider.js";

/** A service whose one operation returns its instance's label. */
export interface Labeller {
  label(): string;
}

/** A service whose one operation returns an integer reading. */
export interface Meter {
  reading(): number;
}

/** The service type `labeller`. */
export const LABELLER = serviceType<Labeller>("labeller");

/** The service type `meter`, which a step requesting a `labeller` never accepts. */
export const METER = serviceType<Meter>("meter");

const types = {
  labeller: LABELLER,
  meter: METER,
} as const satisfies Readonly<Record<ServiceTypeName, unknown>>;

/** The service type itinera is given for a service type the cases name. */
export function serviceTypeOf(
  name: ServiceTypeName,
): ServiceType<Labeller> | ServiceType<Meter> {
  return types[name];
}

/**
 * How an instance answers its operation: with what it is, or by failing
 * with this message, as the scenario scripts it.
 */
type Answering =
  | { readonly kind: "answers" }
  | { readonly kind: "fails"; readonly message: string };

/** The answering of an instance whose operation fails with `message`, when one is given. */
export function answering(message: string | undefined): Answering {
  return message === undefined
    ? { kind: "answers" }
    : { kind: "fails", message };
}

/** The `first labeller`: a labeller every provider of one makes unless the scenario says otherwise. */
export class FirstLabeller implements Labeller {
  constructor(
    readonly labelled: string,
    readonly answers: Answering,
  ) {}

  label(): string {
    return labelOf(this);
  }
}

/** The `second labeller`: another type of labeller, labelling as the first does. */
export class SecondLabeller implements Labeller {
  constructor(
    readonly labelled: string,
    readonly answers: Answering,
  ) {}

  label(): string {
    return labelOf(this);
  }
}

function labelOf({
  labelled,
  answers,
}: FirstLabeller | SecondLabeller): string {
  if (answers.kind === "fails") {
    throw new Error(answers.message);
  }
  return labelled;
}

/** The runner's meter, whose reading is always 1. */
export class ScriptedMeter implements Meter {
  constructor(readonly answers: Answering) {}

  reading(): number {
    if (this.answers.kind === "fails") {
      throw new Error(this.answers.message);
    }
    return 1;
  }
}

const implementationClasses = {
  "first labeller": FirstLabeller,
  "second labeller": SecondLabeller,
} as const satisfies Readonly<Record<Implementation, unknown>>;

/** The class of an implementation of `labeller`. */
export function labellerClassOf(
  implementation: Implementation,
): typeof FirstLabeller | typeof SecondLabeller {
  return implementationClasses[implementation];
}

/**
 * The name the language gives an implementation of `labeller` at run time,
 * which `service_provided` carries.
 */
export function runtimeNameOf(implementation: Implementation): string {
  return labellerClassOf(implementation).name;
}

/**
 * What a step's call of the operation of a service of the type returned,
 * as the runner records it.
 *
 * @throws Error when the operation fails, as the scenario scripts it.
 */
export function operated(type: ServiceTypeName, service: unknown): string {
  return type === "labeller"
    ? (service as Labeller).label()
    : String((service as Meter).reading());
}
