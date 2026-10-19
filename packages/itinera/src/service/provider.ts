import { requestsMadeBy } from "../declaration/allowed.js";
import type { Request } from "../declaration/request.js";
import { named } from "../name.js";
import type { ProviderName } from "../service.js";
import type { Workflow } from "../workflow.js";
import { declarationOn } from "../workflow/registry.js";
import type { ServiceType } from "./request.js";

declare const instanceOf: unique symbol;

/**
 * What a service provider returns: an instance of the service `T`, and,
 * optionally, data for reporters, which `service_provided` carries. A
 * workflow makes it with `this.provide(instance)` or
 * `this.provide(instance, data)`, so a provider that returns nothing does
 * not compile.
 *
 * {@includeCode ../../examples/provider.ts}
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

/**
 * What `@provider` says about a service provider.
 *
 * {@includeCode ../../examples/provider.ts}
 */
export interface ProviderOptions {
  /**
   * `true` to make an instance for every attempt of every step it serves:
   * a provider of attempt scope. Otherwise it is of journey scope, called
   * once per journey, for the first attempt that requests its key.
   */
  readonly perAttempt?: boolean;
  /**
   * The steps it serves, by name, and `<step name>_rescue` for a rescue step.
   * When not given, it is attached to no step and serves every step that
   * requests its key and has no provider of its own for it.
   */
  readonly steps?: readonly [string, ...string[]];
  /** The key of the service it supplies: the method's name when not given. */
  readonly key?: string;
  /** Its name, unique among the workflow's providers: the method's name when not given. */
  readonly name?: string;
}

/** A service provider, as `@provider` recorded it. */
export interface DeclaredProvider {
  /** Its name, as given or the method's. */
  readonly name: ProviderName;
  /** The key of the service it supplies. */
  readonly serviceKey: string;
  /** The type of the service it supplies. */
  readonly type: ServiceType<unknown>;
  /** How long an instance it makes is lent for. */
  readonly scope: "journey" | "attempt";
  /** The steps it serves, by name, or `undefined` when attached to no step. */
  readonly steps: readonly string[] | undefined;
  /** The method that implements it. */
  readonly key: string | symbol;
  /** The requests of the method's parameters, in order. */
  readonly requests: readonly Request[];
}

/**
 * The decorator {@link provider} makes, which TypeScript calls once, with the
 * method it marks, when the class is defined. It compiles only on a method of
 * a workflow class that returns `Provided<T>`, or a promise of it.
 *
 * {@includeCode ../../examples/provider.ts}
 *
 * @typeParam T The type of the service.
 */
export interface ProviderDecorator<T> {
  /**
   * Marks the method `key` of a workflow class, given its prototype.
   *
   * @typeParam M The type of the method.
   */
  <M extends (...requests: never[]) => Provided<T> | Promise<Provided<T>>>(
    prototype: Workflow,
    key: string | symbol,
    method: TypedPropertyDescriptor<M>,
  ): void;
}

const helpers = new WeakSet<object>();

/** The kinds of request a service provider may make. */
export const providerRequests: readonly Request["kind"][] = [
  "journeyId",
  "fromWorkflow",
  "providerReporter",
  "stepName",
  "attempt",
];

/**
 * Marks a method of a workflow class as a service provider of the service
 * type `type`: called with the workflow object as `this` while a step it
 * serves is built, once per journey or, with `perAttempt`, for every
 * attempt. It returns `this.provide(instance)` or
 * `this.provide(instance, data)`, and fails by throwing.
 *
 * Its parameters request what it needs: `@journeyId()`,
 * `@fromWorkflow(key, type)` and `@providerReporter()`, and, for a provider
 * of attempt scope, `@stepName()` and `@attempt()`.
 *
 * {@includeCode ../../examples/provider.ts}
 *
 * @throws Error, when the class is defined, if its name or its key is empty,
 * if a parameter has no request or one a provider may not make, or if the
 * compiler option `emitDecoratorMetadata` is off.
 */
export function provider<T>(
  type: ServiceType<T>,
  options: ProviderOptions = {},
): ProviderDecorator<T> {
  return (prototype, key) => {
    const owner = prototype.constructor;
    declarationOn(owner).providers.push(
      declaredProvider(owner, key, type, options, () =>
        requestsMadeBy(prototype, key, providerRequests, "a service provider"),
      ),
    );
  };
}

/**
 * The service provider of the service type `type` that the method `key` of
 * the workflow class `owner` implements, as `options` say, its parameters
 * making the requests `requested` gives.
 *
 * @throws Error if its name or its key is empty, or whatever `requested`
 * throws.
 */
export function declaredProvider(
  owner: { readonly name: string },
  key: string | symbol,
  type: ServiceType<unknown>,
  options: ProviderOptions,
  requested: () => readonly Request[],
): DeclaredProvider {
  const method = `${owner.name}.${String(key)}`;
  const name = named<ProviderName>(
    options.name ?? String(key),
    `the service provider ${method}`,
  );
  const serviceKey = named<string>(
    options.key ?? String(key),
    `the key of the service provider ${method}`,
  );
  return Object.freeze({
    name,
    serviceKey,
    type,
    scope: options.perAttempt === true ? "attempt" : "journey",
    steps:
      options.steps === undefined
        ? undefined
        : Object.freeze([...options.steps]),
    key,
    requests: requested(),
  });
}

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
