/**
 * What custom code returned, in a few words for a message, such as
 * `undefined` or `a string`, from its type alone, since reading anything of
 * it may call more custom code.
 */
export function whatIs(returned: unknown): string {
  if (returned === null || returned === undefined) {
    return String(returned);
  }
  return typeof returned === "object" ? "an object" : `a ${typeof returned}`;
}

/**
 * Whether `made` is an object of `base`, as `instanceof` says, or not when
 * asking throws, as a revoked proxy or a proxy's trap may, since nothing may
 * escape `run`.
 */
export function isOf<T>(
  made: unknown,
  base: abstract new (...args: never[]) => T,
): made is T {
  try {
    return made instanceof base;
  } catch {
    return false;
  }
}
