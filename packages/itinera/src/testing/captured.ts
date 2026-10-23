import type { PlainValue } from "../value.js";
import { capture } from "../value/capture.js";

/**
 * `value`, captured as it is now, which a test gives as `given`, such as
 * "the value given under total".
 *
 * @throws TypeError when `value` is not a value.
 */
export function captured(value: unknown, given: string): PlainValue {
  const result = capture(value);
  if (result.isErr()) {
    throw new TypeError(`${given} is not a value: ${result.error.problem}`);
  }
  return result.value;
}
