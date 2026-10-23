import { type RequestOf, requestsMadeBy } from "../declaration/allowed.js";
import { marking } from "../declaration/marking.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import { named } from "../name.js";
import type { StepName } from "../step.js";
import type { AdapterName, Workflow } from "../workflow.js";
import type { Supplied } from "./adapter/supplied.js";
import { declarationOn } from "./registry.js";

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
  /** The name of the method that implements it. */
  readonly key: string | symbol;
  /** The method that implements it. */
  readonly method: Method;
  /** The requests of the method's parameters, in order. */
  readonly requests: readonly AdapterRequest[];
}

/** A method of a workflow class, called with the workflow object as `this`. */
export type Method = (this: Workflow, ...requests: never[]) => unknown;

/** Whether `value` is a function, which can be called as a method. */
export function isFunction(value: unknown): value is Method {
  return typeof value === "function";
}

/** A request an input adapter may make. */
export type AdapterRequest = RequestOf<(typeof adapterRequests)[number]>;

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

/** The kinds of request an input adapter may make. */
export const adapterRequests = [
  "stepName",
  "key",
  "fromWorkflow",
  "journeyId",
  "dataBag",
] as const;

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
  return (prototype, key, method) => {
    const owner = prototype.constructor;
    declarationOn(owner).adapters.push(
      declaredAdapter(owner, key, method.value, options, () =>
        requestsMadeBy(prototype, key, adapterRequests, "an input adapter"),
      ),
    );
  };
}

/**
 * The input adapter `method`, the method `key` of the workflow class
 * `owner`, implements, as `options` say, its parameters making the requests
 * `requested` gives.
 *
 * @throws Error if `method` is not a function, if its name is empty, or
 * whatever `requested` throws.
 */
export function declaredAdapter(
  owner: { readonly name: string },
  key: string | symbol,
  method: unknown,
  options: InputAdapterOptions,
  requested: () => readonly AdapterRequest[],
): DeclaredAdapter {
  const where = `${owner.name}.${String(key)}`;
  if (!isFunction(method)) {
    throw new Error(`@inputAdapter marks a method, not ${where}`);
  }
  const name = named<AdapterName>(
    options.name ?? String(key),
    `the input adapter ${where}`,
  );
  return Object.freeze({
    name,
    steps: Object.freeze([...options.steps]),
    key,
    method,
    requests: requested(),
  });
}

/** The input adapter among `adapters` attached to the step `step`, if one is. */
export function adapting(
  adapters: readonly DeclaredAdapter[],
  step: StepName,
): DeclaredAdapter | undefined {
  return adapters.find((attached) => adapts(attached, step));
}

function adapts(adapter: DeclaredAdapter, step: StepName): boolean {
  return adapter.steps.includes(step);
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
  return marking({ kind: "key" });
}
