import { marking, requestsMadeBy } from "../declaration.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { Request } from "../declaration/request.js";
import { named } from "../name.js";
import type { AdapterName, Workflow } from "../workflow.js";
import { declarationOn } from "./registry.js";

/**
 * What an input adapter returns for one input of a step: a value it
 * supplies, or nothing, so that the input is read from the data bag. A
 * workflow makes it with `this.supply(value)` or `this.fromDataBag()`.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 */
export type Supplied = SuppliedValue | FromDataBag;

/**
 * The adapter supplies a value, which the step's input takes, once it is
 * checked to be a value of the input's type.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 */
export interface SuppliedValue {
  /** Tells this from reading the data bag. */
  readonly kind: "supplied";
  /** The value supplied, as the adapter gave it. */
  readonly value: unknown;
}

/**
 * The adapter supplies nothing, so the input is read from the data bag under
 * its key.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 */
export interface FromDataBag {
  /** Tells this from a value supplied. */
  readonly kind: "fromDataBag";
}

/**
 * What `@inputAdapter` says about an input adapter.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 */
export interface InputAdapterOptions {
  /**
   * The steps it adapts the inputs of, by name, and `<step name>_rescue` for
   * a rescue step.
   */
  readonly steps: readonly [string, ...string[]];
  /** Its name, unique among the workflow's adapters: the method's name when not given. */
  readonly name?: string;
}

/** An input adapter, as `@inputAdapter` recorded it. */
export interface DeclaredAdapter {
  /** Its name, as given or the method's. */
  readonly name: AdapterName;
  /** The steps it adapts the inputs of, by name. */
  readonly steps: readonly string[];
  /** The method that implements it. */
  readonly key: string | symbol;
  /** The requests of the method's parameters, in order. */
  readonly requests: readonly Request[];
}

/**
 * The decorator {@link inputAdapter} makes, which TypeScript calls once, with
 * the method it marks, when the class is defined. It compiles only on a
 * method of a workflow class that returns a {@link Supplied}, or a promise of
 * one.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 */
export interface InputAdapterDecorator {
  /**
   * Marks the method `key` of a workflow class, given its prototype.
   *
   * @typeParam M The type of the method.
   */
  <M extends (...requests: never[]) => Supplied | Promise<Supplied>>(
    prototype: Workflow,
    key: string | symbol,
    method: TypedPropertyDescriptor<M>,
  ): void;
}

const helpers = new WeakSet<object>();

/** What `this.fromDataBag()` returns. */
export const fromBag: FromDataBag = Object.freeze({ kind: "fromDataBag" });
helpers.add(fromBag);

const allowed: readonly Request["kind"][] = [
  "stepName",
  "key",
  "fromWorkflow",
  "journeyId",
  "dataBag",
];

/**
 * Marks a method of a workflow class as an input adapter: asked for each
 * input of the steps it is attached to while each is built, in the order the
 * step declares them, with the workflow object as `this`. It returns
 * `this.supply(value)`, or `this.fromDataBag()` to read the input from the
 * data bag, and fails by throwing.
 *
 * Its parameters request what it needs: `@stepName()`, `@key()`,
 * `@fromWorkflow(key, type)`, `@journeyId()` and `@dataBag()`.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 *
 * @throws Error, when the class is defined, if its name is empty, if a
 * parameter has no request or one an adapter may not make, or if the
 * compiler option `emitDecoratorMetadata` is off.
 */
export function inputAdapter(
  options: InputAdapterOptions,
): InputAdapterDecorator {
  return (prototype, key) => {
    const owner = prototype.constructor;
    declarationOn(owner).adapters.push({
      name: named<AdapterName>(
        options.name ?? String(key),
        `the input adapter ${owner.name}.${String(key)}`,
      ),
      steps: [...options.steps],
      key,
      requests: requestsMadeBy(prototype, key, allowed, "an input adapter"),
    });
  };
}

/**
 * Requests, in an input adapter, the key of the input it is asked for.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 */
export function key(): RequestDecorator<
  string,
  Place<Workflow, string | symbol>
> {
  return marking(() => ({ kind: "key" }));
}

/** A value an input adapter supplies, as `this.supply(value)` makes it. */
export function supplied(value: unknown): SuppliedValue {
  const made: SuppliedValue = Object.freeze({ kind: "supplied", value });
  helpers.add(made);
  return made;
}

/**
 * Whether `returned` is what itinera's helpers make for an input adapter,
 * rather than anything else a cast lets an adapter return.
 */
export function isSupplied(returned: unknown): returned is Supplied {
  return (
    typeof returned === "object" && returned !== null && helpers.has(returned)
  );
}
