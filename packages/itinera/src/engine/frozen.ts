/**
 * `made`, frozen through and through, so that whoever receives it cannot
 * change what the next one reads.
 */
export function frozen<T>(made: T): T {
  if (typeof made === "object" && made !== null && !Object.isFrozen(made)) {
    Object.values(made).forEach(frozen);
    Object.freeze(made);
  }
  return made;
}
