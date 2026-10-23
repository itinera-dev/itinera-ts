import type { PlainValue } from "../value.js";

let made: (values: ReadonlyMap<string, PlainValue>) => DataBag;

/**
 * The data of one journey: values by key, in the order each key was first
 * set. It starts as the instance's initial data, and a journey that succeeds
 * or fails hands it over in its result, as the journey's output. Only itinera
 * makes one.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export class DataBag {
  static {
    made = (values) => new DataBag(values);
  }

  readonly #values: ReadonlyMap<string, PlainValue>;

  private constructor(values: ReadonlyMap<string, PlainValue>) {
    this.#values = new Map(values);
  }

  /** Its keys, in the order each was first set. */
  keys(): readonly string[] {
    return [...this.#values.keys()];
  }
}

/** A data bag holding a copy of `values`, in their order. */
export function dataBagOf(values: ReadonlyMap<string, PlainValue>): DataBag {
  return made(values);
}
