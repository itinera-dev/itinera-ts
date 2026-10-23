/**
 * Values: data that can be serialised, the only data a data bag, an event, a
 * reason's details or global metadata holds.
 *
 * @module
 */

export {
  boolean,
  classOf,
  guard,
  integer,
  list,
  listOf,
  number,
  object,
  objectOf,
  optional,
  type Optional,
  type RequestType,
  string,
  type ValueClass,
} from "./value/token.js";

/**
 * A value in the plain form itinera keeps: `null`, a boolean, a finite number,
 * a string, a list of plain values, or a plain object of them.
 *
 * Whatever itinera stores or passes on, in the data bag, an event, a reason's
 * details or global metadata, is plain: a {@link SerialisesItself} was turned
 * into plain data when it was given. Types cannot tell a finite number from
 * `NaN` or the infinities, nor see a cycle, so itinera also checks every value
 * when it is given.
 *
 * {@includeCode ../examples/plain-value.ts}
 */
export type PlainValue =
  | null
  | boolean
  | number
  | string
  | readonly PlainValue[]
  | { readonly [key: string]: PlainValue };

/**
 * An object that turns itself into a value, usually an instance of a class
 * with a `toValue()` method.
 *
 * itinera calls `toValue()` once, when the object is given, and keeps what it
 * returns, so changing the object afterwards changes nothing that was given.
 * A class whose instances a request reads back also has a static
 * `fromValue(value)`, which makes an instance again from what `toValue()`
 * returned. A `toValue()` that throws, or returns what is not a value, makes
 * the object not a value.
 *
 * {@includeCode ../examples/serialises-itself.ts}
 */
export interface SerialisesItself {
  /** The value this object stands for, in its place. */
  toValue(): Value;
}

/**
 * Data that can be serialised: plain data, as {@link PlainValue}, in which any
 * part may be an object that {@link SerialisesItself}.
 *
 * Functions, `undefined`, symbols, `bigint`, `Date`, `Map` and other objects
 * with methods are not values, and do not compile where a `Value` is expected.
 * An interface is not a `Value` either, since TypeScript gives an interface no
 * index signature: {@link AsValue} checks one. A property with a symbol key
 * compiles, since an index signature does not look at it, and is refused when
 * it is given.
 *
 * {@includeCode ../examples/value.ts}
 */
export type Value =
  | null
  | boolean
  | number
  | string
  | readonly Value[]
  | { readonly [key: string]: Value }
  | SerialisesItself;

/**
 * `T` itself when `T` is a value, and otherwise a type nothing is assignable
 * to, for a function taking any value whose type it infers, interfaces
 * included, as `value: T & AsValue<T>`.
 *
 * Every part of `T` is checked: a function, `undefined`, a symbol, a `bigint`
 * or an object with methods that does not serialise itself, at any depth,
 * makes `T` not a value. Some types pass that are refused when they are
 * given, as `NaN`, the infinities and cycles are:
 *
 * - an instance of a class whose members are all data, since types cannot see
 *   an object's prototype;
 * - `object` and `{}`, which say nothing of what they hold, and are the type
 *   of an empty object too;
 * - a property with a symbol key;
 * - an optional property holding `undefined`, unless the compiler's
 *   `exactOptionalPropertyTypes` is on.
 *
 * {@includeCode ../examples/as-value.ts}
 */
export type AsValue<T> = [T] extends [Value]
  ? T
  : T extends null | boolean | number | string | SerialisesItself
    ? T
    : T extends (...args: never[]) => unknown
      ? never
      : T extends readonly unknown[]
        ? { readonly [I in keyof T]: AsValue<T[I]> }
        : T extends object
          ? {
              readonly [K in keyof T]: K extends string | number
                ? AsValue<T[K]>
                : never;
            }
          : never;
