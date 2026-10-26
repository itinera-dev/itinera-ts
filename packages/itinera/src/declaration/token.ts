import type { Place } from "./parameter.js";

/**
 * The key under which a request decorator carries, in the types only, what
 * it gives a builder that is given it by position.
 */
export declare const token: unique symbol;

/**
 * What a request decorator gives a builder that is given it by position:
 * what the request gives, `A`, where it may be made, `P`, and whether its type
 * is written, `W`, without which a builder cannot take it, since there is no
 * metadata to read the type from.
 *
 * {@includeCode ../../examples/tokens-by-position.ts}
 */
export interface Given<A, P extends Place, W extends boolean> {
  /** What the request gives its parameter. */
  readonly gives: A;
  /** Where the request may be made, as a parameter, so a place fits when it is one of them. */
  readonly at: (place: P) => void;
  /** Whether the request's type is written. */
  readonly typed: W;
}

/**
 * A request given to a builder by position, for a parameter of type `T` in
 * the place `P`: a request decorator, such as `input("amount", integer)`,
 * whose type is written, which may be made there, and which gives what the
 * parameter accepts.
 *
 * {@includeCode ../../examples/tokens-by-position.ts}
 */
export interface Token<T, P extends Place> {
  /** What the request gives, where it may be made, and that its type is written. */
  readonly [token]: Given<T, P, true>;
}

/**
 * The requests a builder is given by position for parameters of the types
 * `T`, in order, in the place `P`: one {@link Token} per parameter, none left
 * out.
 *
 * {@includeCode ../../examples/tokens-by-position.ts}
 */
export type Tokens<T extends readonly unknown[], P extends Place> = {
  readonly [I in keyof T]-?: Token<T[I], P>;
};

/**
 * The types of the parameters of the method `K` of `T`.
 *
 * {@includeCode ../../examples/tokens-by-position.ts}
 */
export type ParametersOf<T, K extends keyof T> = T[K] extends (
  ...args: infer A
) => unknown
  ? A
  : never;

/**
 * The names of the methods of `T` that return `R` or a promise of it, which
 * a builder may be given as a hook, an input adapter or a service provider.
 *
 * {@includeCode ../../examples/tokens-by-position.ts}
 */
export type MethodKey<T, R> = {
  [K in keyof T & (string | symbol)]: T[K] extends (
    ...requests: never[]
  ) => R | Promise<R>
    ? K
    : never;
}[keyof T & (string | symbol)];
