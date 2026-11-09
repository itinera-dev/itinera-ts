import { ModelError } from "./error.js";

/**
 * The steps an input adapter or a service provider is attached to, one or
 * more.
 *
 * @throws ModelError when there is none.
 */
export function attachedTo(
  what: "input adapter" | "service provider",
  name: string,
  steps: readonly string[],
): readonly [string, ...string[]] {
  const [first, ...rest] = steps;
  if (first === undefined) {
    throw new ModelError(`the ${what} "${name}" is attached to no step`);
  }
  return [first, ...rest];
}
