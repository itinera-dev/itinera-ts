import { type RequestOf, requestsMadeBy } from "../declaration/allowed.js";
import { type DataBag, dataBagFor } from "../journey/data-bag.js";
import type { PlainValue, Value } from "../value.js";
import { capture } from "../value/capture.js";
import type { Workflow } from "../workflow.js";
import type { Method } from "./adapter.js";
import { declarationOn } from "./registry.js";

/**
 * Marks the method of a workflow class that makes the journey ID of each of
 * its instances, in place of a random UUID. It is called with the workflow
 * object as `this`, while the instance is created, and returns the ID
 * synchronously. Its one parameter, when it has one, requests the data bag
 * with `@dataBag()`, holding the instance's initial data, from which it may
 * derive the ID.
 *
 * {@includeCode ../../examples/id-generator.ts}
 *
 * @throws Error, when the class is defined, if a parameter has no request or
 * one an ID generator may not make, if the class has another ID generator,
 * or if the compiler option `emitDecoratorMetadata` is off.
 */
export function idGenerator(): IdGeneratorDecorator {
  return (prototype, key, method) => {
    const generate = method.value;
    if (generate === undefined) {
      throw new Error(`@idGenerator marks a method, not ${String(key)}`);
    }
    const requests = requestsMadeBy(
      prototype,
      key,
      idGeneratorRequests,
      "an ID generator",
    );
    const declaration = declarationOn(prototype.constructor);
    if (declaration.idGenerator !== undefined) {
      throw new Error(
        `${prototype.constructor.name} has more than one ID generator`,
      );
    }
    declaration.idGenerator = { key, method: generate, requests };
  };
}

/**
 * The decorator {@link idGenerator} makes, which TypeScript calls once, with
 * the method it marks, when the class is defined.
 *
 * {@includeCode ../../examples/id-generator.ts}
 */
export interface IdGeneratorDecorator {
  /**
   * Marks the method `key` of a workflow class, given its prototype.
   *
   * @typeParam M The type of the method, which takes nothing or the data bag
   * and returns the journey ID.
   */
  <M extends (dataBag: DataBag) => string>(
    prototype: Workflow,
    key: string | symbol,
    method: TypedPropertyDescriptor<M>,
  ): void;
}

/**
 * The names of the methods of `W` that can make a journey ID: those taking
 * nothing or the data bag and returning a string.
 *
 * {@includeCode ../../examples/builder.ts}
 */
export type IdGeneratorKey<W> = {
  [K in keyof W & (string | symbol)]: W[K] extends (dataBag: DataBag) => string
    ? K
    : never;
}[keyof W & (string | symbol)];

/** The kinds of request an ID generator may make. */
export const idGeneratorRequests = ["dataBag"] as const;

/** An ID generator, as `@idGenerator` or a builder recorded it. */
export interface DeclaredIdGenerator {
  /** The name of the method that implements it. */
  readonly key: string | symbol;
  /** The method that implements it. */
  readonly method: Method;
  /** The requests of the method's parameters, in order. */
  readonly requests: readonly RequestOf<(typeof idGeneratorRequests)[number]>[];
}

/**
 * What `generator` returns, called with `workflow` as `this` and given, for
 * each request, a data bag holding `initialData`, without the values that
 * are not values, which `run` refuses. The data bag shows nothing once the
 * call returns.
 *
 * @throws Whatever the method throws.
 */
export function generatedBy(
  generator: DeclaredIdGenerator,
  workflow: Workflow,
  initialData: ReadonlyMap<string, Value>,
): unknown {
  const lent = dataBagFor(new Map([...initialData].flatMap(capturedEntry)));
  try {
    return Reflect.apply(
      generator.method,
      workflow,
      new Array<DataBag>(generator.requests.length).fill(lent.dataBag),
    );
  } finally {
    lent.close();
  }
}

function capturedEntry([key, value]: readonly [string, Value]): [
  string,
  PlainValue,
][] {
  const captured = capture(value);
  return captured.isOk() ? [[key, captured.value]] : [];
}
