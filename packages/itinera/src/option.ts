/**
 * `Option`, `Some` and `None`, as `ts-results-es` defines them, which an
 * optional request and a typed read of the data bag give.
 *
 * `Some(value)` holds what is present, a stored `null` included, and `None`
 * says that nothing is, so the two can never be confused. Import them only
 * from itinera: an ESM application importing them from `ts-results-es`
 * directly gets a second copy of their types, which does not type-check
 * against itinera's.
 *
 * {@includeCode ../examples/option.ts}
 *
 * @module
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the one place itinera takes them from ts-results-es
export { None, Option, Some } from "ts-results-es";
