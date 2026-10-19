import { z } from "zod";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Checked } from "../declaration/request.js";
import { named } from "../name.js";
import type { PlainValue, SerialisesItself } from "../value.js";

/**
 * Any value, as a request receives one: itinera checks every value when it
 * is given, so this check accepts whatever was stored.
 */
const anyValue = z.custom<PlainValue>();

/**
 * A string.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export const string: z.ZodString = z.string();

/**
 * A whole number that a number holds exactly: from -(2^53 - 1) to
 * 2^53 - 1, as `Number.isSafeInteger` says, so a larger one is of another
 * type.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export const integer: z.ZodInt = z.int();

/**
 * Any number. Every number a value holds is finite.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export const number: z.ZodNumber = z.number();

/**
 * `true` or `false`.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export const boolean: z.ZodBoolean = z.boolean();

/**
 * A list of any values.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export const list: z.ZodArray<z.ZodCustom<PlainValue, PlainValue>> =
  z.array(anyValue);

/**
 * An object of any values, by key: never a list, nor `null`.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export const object: z.ZodRecord<
  z.ZodString,
  z.ZodCustom<PlainValue, PlainValue>
> = z.record(z.string(), anyValue);

/**
 * A list whose every item has the type `item` checks.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export function listOf<T extends z.ZodType>(item: T): z.ZodArray<T> {
  return z.array(item);
}

/**
 * An object with a property of each key `shape` names, of the type its token
 * checks. A property whose token ends in Zod's `.optional()` may be missing.
 * Other properties are allowed, and not checked.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export function objectOf<S extends z.ZodRawShape>(shape: S): z.ZodObject<S> {
  return z.object(shape);
}

/**
 * A class whose instances turn themselves into values, and which makes an
 * instance again from such a value.
 *
 * {@includeCode ../../examples/class-of.ts}
 *
 * @typeParam T The type of its instances.
 */
export interface ValueClass<T extends SerialisesItself = SerialisesItself> {
  /** The prototype every instance shares. */
  readonly prototype: T;
  /**
   * Makes an instance from the value an instance's `toValue()` returned.
   * It throws when it cannot.
   */
  fromValue(value: PlainValue): T;
}

const carried = new WeakMap<object, ValueClass>();

/**
 * An instance of the class `type`, which serialises itself. The data bag
 * holds the value an instance's `toValue()` returned, and a request of this
 * type receives what `type.fromValue` makes from it, so a step can be given
 * an instance with its methods while the data bag holds only plain data.
 *
 * The check accepts any value: whether `fromValue` can make an instance from
 * it is up to `fromValue`. The type this schema checks for the compiler is
 * the instance's, since that is what a request receives.
 *
 * {@includeCode ../../examples/class-of.ts}
 */
export function classOf<T extends SerialisesItself>(
  type: ValueClass<T>,
): z.ZodCustom<T, T> {
  const schema = z.custom<T>();
  carried.set(schema, type);
  return schema;
}

/** The class `schema` carries, when `classOf` made it. */
export function classCarriedBy(schema: object): ValueClass | undefined {
  return carried.get(schema);
}

/**
 * A value that `isT`, an application's own type guard, accepts, named `name`
 * for people reading the schema.
 *
 * {@includeCode ../../examples/tokens.ts}
 *
 * @throws Error if the name is empty.
 */
export function guard<T>(
  name: string,
  isT: (value: unknown) => value is T,
): z.ZodCustom<T, T> {
  return z.custom<T>(isT).describe(named<string>(name, "a guard"));
}

/**
 * What a request may name as its type: any Standard Schema validator, such as
 * one of itinera's tokens, or one wrapped in {@link optional}.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export type RequestType = StandardSchemaV1 | Optional<StandardSchemaV1>;

const wrapped: unique symbol = Symbol("wrapped");

/**
 * A request that may find no value, whose type `S` checks a value when there
 * is one. Only {@link optional} makes one.
 *
 * {@includeCode ../../examples/tokens.ts}
 *
 * @typeParam S The type of a value, when there is one.
 */
export interface Optional<S extends StandardSchemaV1> {
  /** Marks the object as made by {@link optional}, wrapping `S`. */
  readonly [wrapped]: S;
}

/**
 * Marks a request optional: when its key has no value, it receives `None`,
 * and otherwise `Some` of the value, which `schema` checks. Any Standard
 * Schema validator can be made optional.
 *
 * It is not itself a schema, so it is written only as a request's own type,
 * never inside {@link listOf} or {@link objectOf}, where Zod's `.optional()`
 * marks a property that may be missing.
 *
 * {@includeCode ../../examples/tokens.ts}
 */
export function optional<S extends StandardSchemaV1>(schema: S): Optional<S> {
  return Object.freeze({ [wrapped]: schema });
}

/** What `type` checks: the schema it is, or the one {@link optional} wraps. */
export function unwrapped(type: RequestType): Checked {
  return wrapped in type
    ? { schema: type[wrapped], optional: true }
    : { schema: type, optional: false };
}
