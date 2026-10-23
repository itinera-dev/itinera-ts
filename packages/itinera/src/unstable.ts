/**
 * API that may change in any release: what the specification has not
 * accepted yet, or what itinera does not fully implement yet. Each item moves
 * to the subpath of its concept once itinera implements it fully.
 *
 * - Values: {@link Value}, {@link PlainValue}, {@link SerialisesItself} and
 *   {@link AsValue}, which move to `itinera/value`.
 * - `Option`, `Some` and `None`, as `ts-results-es` defines them, which move
 *   to `itinera/option`. An optional request and a typed read of the data bag
 *   give an `Option`: `Some(value)` when present, a stored `null` included,
 *   and `None` only when absent. Import them only from itinera: an ESM
 *   application importing them from `ts-results-es` directly gets a second
 *   copy of their types, which does not type-check against itinera's.
 *
 * {@includeCode ../examples/option.ts}
 *
 * @module
 */
export type { AsValue, PlainValue, SerialisesItself, Value } from "./value.js";
export { None, Option, Some } from "./option.js";
