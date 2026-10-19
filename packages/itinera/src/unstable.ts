/**
 * API that may change in any release: what the specification has not
 * accepted yet, or what itinera does not fully implement yet. Each item moves
 * to the subpath of its concept once itinera implements it fully.
 *
 * - Values: {@link Value}, {@link PlainValue}, {@link SerialisesItself} and
 *   {@link AsValue}, which move to `itinera/value`.
 *
 * @module
 */
export type { AsValue, PlainValue, SerialisesItself, Value } from "./value.js";
