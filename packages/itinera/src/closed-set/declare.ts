import type { ClosedSet } from "../closed-set.js";

/** Declares a closed set of names, each mapped to the text of its value. */
export function closedSet<const Names extends Record<string, string>>(
  names: Names,
): ClosedSet<Names> {
  const values = Object.freeze(Object.values(names) as Names[keyof Names][]);
  const known = new Set<string>(values);
  return Object.freeze({
    ...names,
    values,
    has: (text: string): text is Names[keyof Names] => known.has(text),
  });
}
