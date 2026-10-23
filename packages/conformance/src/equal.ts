import { isDeepStrictEqual } from "node:util";

/** Whether what was found is deeply and strictly equal to `expected`. */
export function equalTo(expected: unknown): (found: unknown) => boolean {
  return (found) => isDeepStrictEqual(found, expected);
}
