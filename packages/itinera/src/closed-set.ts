/**
 * Closed sets of names, such as the kinds of events, the abort reasons and
 * the hooks: the types every closed set itinera declares is built from.
 *
 * {@includeCode ../examples/closed-set.ts}
 *
 * @module itinera/closed-set
 */

/**
 * A closed set of names, such as the kinds of events or the abort reasons:
 * each name as a member of its own, every value in the order declared, and a
 * check that reads a value back from its text.
 *
 * The type of a value of the set is the union of its values, written as the
 * specification writes them, so a value compares with a string literal and
 * narrows a discriminated union as any literal does.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export type ClosedSet<Names extends Readonly<Record<string, string>>> =
  Readonly<Names> & EveryValue<Names[keyof Names]>;

/**
 * What every {@link ClosedSet} offers besides its names: every value, and a
 * check that reads one back from its text.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export interface EveryValue<Value extends string> {
  /** Every value of the set, in the order it was declared. */
  readonly values: readonly Value[];
  /** Whether `text` is a value of the set, written exactly as it is. */
  readonly has: (text: string) => text is Value;
}

/**
 * The type of the values of a {@link ClosedSet}: the union of its values.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export type ValueOf<Set extends EveryValue<string>> =
  Set extends EveryValue<infer Value> ? Value : never;
