import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Option } from "../option.js";
import type { SerialisesItself } from "../value.js";
import type { Optional, RequestType } from "../value/token.js";
import type { Given, token } from "./token.js";

/**
 * Where a request may be made: on a parameter of the constructor of a class
 * of type `T`, when `K` is `undefined`, or of its method named `K`, when `T`
 * is the type of its instances.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export interface Place<
  T = unknown,
  K extends string | symbol | undefined = string | symbol | undefined,
> {
  /** What the decorator is given: the class, or its prototype. */
  readonly target: T;
  /** The method, or `undefined` for the constructor. */
  readonly key: K;
}

/**
 * The declared type of parameter `I` of the constructor of `T`, when `K` is
 * `undefined`, or of its method `K`.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export type ParameterOf<T, K, I extends number> = [K] extends [undefined]
  ? T extends abstract new (...args: never) => unknown
    ? ConstructorParameters<T>[I]
    : never
  : K extends keyof T
    ? T[K] extends (...args: never) => unknown
      ? Parameters<T[K]>[I]
      : never
    : never;

/**
 * What a request whose type is `T` gives its parameter: the value, or, when
 * `T` is {@link optional}, `Some` of the value or `None`. For a class that
 * serialises itself, named with `classOf`, the value is an instance of it.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export type Answer<T extends RequestType> =
  T extends Optional<infer S>
    ? Option<StandardSchemaV1.InferInput<S>>
    : T extends StandardSchemaV1
      ? StandardSchemaV1.InferInput<T>
      : never;

/**
 * Whether the type `P` of a parameter can be read from the metadata the
 * compiler records: exactly `number`, `string` or `boolean`, or a class that
 * serialises itself.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export type ReadFromMetadata<P> = [P] extends [number]
  ? [number] extends [P]
    ? [`${number}`] extends [`${P & number}`]
      ? true
      : false
    : false
  : [P] extends [string]
    ? [string] extends [P]
      ? true
      : false
    : [P] extends [boolean]
      ? [boolean] extends [P]
        ? true
        : false
      : [P] extends [SerialisesItself]
        ? true
        : false;

/**
 * A decorator that marks a parameter with a request for something of type
 * `A`, in one of the places `P` names. It compiles only on a parameter in
 * such a place, whose declared type accepts `A`.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export interface RequestDecorator<A, P extends Place> {
  /**
   * What the request gives and where it may be made, for a builder that is
   * given it by position. It exists only in the types.
   */
  readonly [token]: Given<A, P, true>;

  /**
   * Marks the parameter at position `index` of the constructor of `target`,
   * when `key` is `undefined`, or of its method `key`.
   */
  <T extends P["target"], K extends KeyIn<P, T>, I extends number>(
    target: T,
    key: K,
    index: Strict<
      [A] extends [ParameterOf<T, K, I>]
        ? I
        : "the parameter's type does not accept what the request gives"
    >,
  ): void;
}

/**
 * A decorator that marks a parameter with a request for a value, whose type
 * is `T`, or, when `T` is `undefined`, the parameter's own type, read from
 * the metadata the compiler records. It compiles only on a parameter in one
 * of the places `P` names, whose declared type accepts what the request
 * gives, as {@link Answer} says; with no type written, only on one whose
 * type the metadata can say, as {@link ReadFromMetadata} says.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export interface ValueRequestDecorator<
  T extends RequestType | undefined,
  P extends Place,
> {
  /**
   * What the request gives and where it may be made, for a builder that is
   * given it by position, which takes it only when its type is written. It
   * exists only in the types.
   */
  readonly [token]: T extends RequestType
    ? Given<Answer<T>, P, true>
    : Given<unknown, P, false>;

  /**
   * Marks the parameter at position `index` of the constructor of `target`,
   * when `key` is `undefined`, or of its method `key`.
   */
  <X extends P["target"], K extends KeyIn<P, X>, I extends number>(
    target: X,
    key: K,
    index: Strict<
      T extends RequestType
        ? [Answer<T>] extends [ParameterOf<X, K, I>]
          ? I
          : "the parameter's type does not accept what the request gives"
        : ReadFromMetadata<ParameterOf<X, K, I>> extends true
          ? I
          : "write the request's type: the metadata cannot say this parameter's"
    >,
  ): void;
}

/**
 * The keys a request may be made on in the places `P` names, for the target
 * `T`.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export type KeyIn<P extends Place, T> =
  P extends Place<infer X, infer K> ? (T extends X ? K : never) : never;

/**
 * `I`, when the compiler option `strictNullChecks` is on. Without it, `null`
 * belongs to every type, so a request decorator could not refuse a parameter
 * whose type does not accept what it gives, and none compiles.
 *
 * {@includeCode ../../examples/requests.ts}
 */
export type Strict<I> = null extends string
  ? "itinera needs the compiler option strictNullChecks"
  : I;
