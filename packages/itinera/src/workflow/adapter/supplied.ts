/**
 * What an input adapter returns for one input of a step: a value it
 * supplies, or nothing, so that the input is read from the data bag. A
 * workflow makes it with `this.supply(value)` or `this.fromDataBag()`.
 *
 * {@includeCode ../../../examples/input-adapter.ts}
 */
export type Supplied = SuppliedValue | FromDataBag;

/**
 * The adapter supplies a value, which the step's input takes, once it is
 * checked to be a value of the input's type.
 *
 * {@includeCode ../../../examples/input-adapter.ts}
 */
export interface SuppliedValue {
  /** Tells this from reading the data bag. */
  readonly kind: "supplied";
  /** The value supplied, as the adapter gave it. */
  readonly value: unknown;
}

/**
 * The adapter supplies nothing, so the input is read from the data bag under
 * its key.
 *
 * {@includeCode ../../../examples/input-adapter.ts}
 */
export interface FromDataBag {
  /** Tells this from a value supplied. */
  readonly kind: "fromDataBag";
}

const helpers = new WeakSet<object>();

/** What `this.fromDataBag()` returns. */
export const fromBag: FromDataBag = Object.freeze({ kind: "fromDataBag" });
helpers.add(fromBag);

/** A value an input adapter supplies, as `this.supply(value)` makes it. */
export function supplied(value: unknown): SuppliedValue {
  const made: SuppliedValue = Object.freeze({ kind: "supplied", value });
  helpers.add(made);
  return made;
}

/**
 * Whether `returned` is what itinera's helpers make for an input adapter,
 * rather than anything else a cast lets an adapter return.
 */
export function isSupplied(returned: unknown): returned is Supplied {
  return (
    typeof returned === "object" && returned !== null && helpers.has(returned)
  );
}
