import { None, type Option, Some } from "../option.js";
import type { PlainValue } from "../value.js";
import { received } from "../value/read.js";
import type { Checked } from "../declaration/request.js";

/**
 * What reading a key of the data bag as a type found: a value of that type,
 * nothing, or a value of another type. Its `kind` tells which, and
 * `option()` gives the value, when there is one of the type asked for, for a
 * reader to whom the difference between nothing and another type does not
 * matter.
 *
 * {@includeCode ../../examples/data-bag.ts}
 *
 * @typeParam T The type asked for.
 */
export type Read<T> = Present<T> | Absent | OtherType;

/**
 * A value of the type asked for is held under the key.
 *
 * {@includeCode ../../examples/data-bag.ts}
 */
export interface Present<T> {
  /** Tells this read from the others. */
  readonly kind: "present";
  /** The value, as the reader's own copy. */
  readonly value: T;
  /** `Some` of the value. */
  option(): Option<T>;
}

/**
 * Nothing is held under the key.
 *
 * {@includeCode ../../examples/data-bag.ts}
 */
export interface Absent {
  /** Tells this read from the others. */
  readonly kind: "absent";
  /** `None`. */
  option(): Option<never>;
}

/**
 * A value of another type than the one asked for is held under the key.
 *
 * {@includeCode ../../examples/data-bag.ts}
 */
export interface OtherType {
  /** Tells this read from the others. */
  readonly kind: "other type";
  /** `None`. */
  option(): Option<never>;
}

const absent: Absent = Object.freeze({ kind: "absent", option: none });

const otherType: OtherType = Object.freeze({
  kind: "other type",
  option: none,
});

function none(): Option<never> {
  return None;
}

/**
 * What reading `stored`, the value under a key if there is one, as `type`
 * checks finds: when `type` is optional, `None` for no value and `Some` of a
 * value of the type, each present.
 */
export function readOf(
  stored: PlainValue | undefined,
  { schema, optional }: Checked,
): Read<unknown> {
  if (stored === undefined) {
    return optional ? present(None) : absent;
  }
  const value = received(stored, schema);
  if (value.isNone()) {
    return otherType;
  }
  return present(optional ? value : value.value);
}

function present<T>(value: T): Present<T> {
  return Object.freeze({
    kind: "present",
    value,
    option: () => Some(value),
  });
}
