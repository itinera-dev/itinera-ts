/**
 * The converted types: types of the runner's own, standing for classes of an
 * application, given the value conversions the cases script.
 */
import { guard, type Value } from "itinera/value";

const failed = "conversion failed";

/**
 * An object of `throwing record`, whose conversions both throw: turning the
 * object into a value, and turning any value into an object of the type.
 */
export class ThrowingRecord {
  /** Makes an object of the type from a value, which it never can. */
  static fromValue(): ThrowingRecord {
    throw new Error(failed);
  }

  /** The value the object stands for, which it never gives. */
  toValue(): Value {
    throw new Error(failed);
  }
}

/**
 * The check of `rejected record`, an application's own type guard, which
 * says that no value is of the type, without throwing.
 */
export const rejectedRecordGuard = guard("rejected record", isRejectedRecord);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- a type guard names what it checks, even one that refuses every value
function isRejectedRecord(value: unknown): value is never {
  return false;
}
