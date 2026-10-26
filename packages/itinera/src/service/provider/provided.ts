declare const instanceOf: unique symbol;

/**
 * What a service provider returns: an instance of the service `T`, and,
 * optionally, data for reporters, which `service_provided` carries. A
 * workflow makes it with `this.provide(instance)` or
 * `this.provide(instance, data)`, so a provider that returns nothing does
 * not compile.
 *
 * {@includeCode ../../../examples/provider.ts}
 *
 * @typeParam T The type of the service.
 */
export interface Provided<T> {
  /** The instance lent to the step. */
  readonly instance: T;
  /** The data for reporters, as the provider gave it, if it gave any. */
  readonly data?: unknown;
  /** Marks the object as made by `this.provide(...)`, for a service `T`. */
  readonly [instanceOf]: T;
}

const helpers = new WeakSet<object>();

/** An instance a provider supplies, as `this.provide(...)` makes it. */
export function provided<T>(instance: T, data: unknown): Provided<T> {
  const made = Object.freeze(
    data === undefined ? { instance } : { instance, data },
  ) as Provided<T>;
  helpers.add(made);
  return made;
}

/**
 * Whether `returned` is what `this.provide(...)` makes, rather than anything
 * else a cast lets a provider return.
 */
export function isProvided(returned: unknown): returned is Provided<unknown> {
  return (
    typeof returned === "object" && returned !== null && helpers.has(returned)
  );
}
