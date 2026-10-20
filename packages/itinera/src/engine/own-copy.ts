/**
 * The error as its receiver's own copy, so that what the receiver changes on
 * it reaches no one else, or the error itself when it cannot be copied, as a
 * proxy whose traps throw cannot. A thrown value that is not an object is
 * given as it is.
 */
export function ownCopy(error: unknown): unknown {
  if (typeof error !== "object" || error === null) {
    return error;
  }
  try {
    return copyOf(error);
  } catch {
    return error;
  }
}

/**
 * An object with the prototype and the own properties of `error`, made as an
 * `Error` when it is one, so that `instanceof`, its message, its stack and its
 * cause hold. Its getters are copied, not called, so one that throws does so
 * only when its receiver reads it. The stack is copied as its value, since the
 * runtime's own accessor would read the copy's.
 */
function copyOf(error: object): object {
  const copy: object = error instanceof Error ? new Error() : {};
  Reflect.setPrototypeOf(copy, Reflect.getPrototypeOf(error));
  Object.defineProperties(copy, Object.getOwnPropertyDescriptors(error));
  if (error instanceof Error && Object.hasOwn(error, "stack")) {
    Object.defineProperty(copy, "stack", {
      value: error.stack,
      writable: true,
      configurable: true,
    });
  }
  return copy;
}
