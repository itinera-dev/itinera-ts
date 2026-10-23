import type { Checked, Request } from "./declaration/request.js";
import { recordedTypes, typeFromMetadata } from "./declaration/metadata.js";
import { type RequestType, unwrapped } from "./value/token.js";

/** A class, whose constructor or methods carry requests. */
export type Owner = abstract new (...args: never[]) => unknown;

/** A method of a class, or `undefined` for its constructor. */
export type Key = string | symbol | undefined;

const table = new WeakMap<object, Map<Key, Map<number, Request>>>();

/**
 * Records that the parameter at `index` of the constructor of `target`, when
 * `key` is `undefined`, or of the method `key` of the prototype `target`,
 * makes `request`.
 *
 * @throws Error if the parameter carries a request already.
 */
function record(
  target: object,
  key: Key,
  index: number,
  request: Request,
): void {
  const owner = ownerOf(target, key);
  const byKey = table.get(owner) ?? new Map<Key, Map<number, Request>>();
  table.set(owner, byKey);
  const byIndex = byKey.get(key) ?? new Map<number, Request>();
  byKey.set(key, byIndex);
  if (byIndex.has(index)) {
    throw new Error(
      `${where(owner, key)}: parameter ${String(index + 1)} carries two requests`,
    );
  }
  byIndex.set(index, request);
}

/**
 * A parameter decorator, typed as `D`, that records the request `requested`
 * makes of the parameter it marks.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller names the decorator's type, which the compiler checks where it is applied
export function marking<D>(
  requested: (target: object, key: Key, index: number) => Request,
): D {
  const mark = (target: object, key: Key, index: number): void => {
    record(target, key, index, requested(target, key, index));
  };
  return mark as D;
}

/**
 * The requests of the parameters of the constructor of `owner`, when `key` is
 * `undefined`, or of its method `key`, in the order of the parameters.
 *
 * Parameters are counted from the types the compiler recorded, or else from
 * the function's `length`, which leaves out a parameter with a default value
 * and a rest parameter.
 *
 * @throws Error naming the first parameter that carries no request.
 */
export function requestsOf(owner: Owner, key: Key): readonly Request[] {
  const recorded = table.get(owner)?.get(key) ?? new Map<number, Request>();
  const count = Math.max(
    declaredParameters(owner, key),
    ...[...recorded.keys()].map(next),
  );
  return Array.from({ length: count }, (_, index) =>
    requestAt(recorded, index, owner, key),
  );
}

/**
 * The type a request for a value checks: `type`, when it is written, or else
 * the declared type of the parameter at `index`, read from the metadata the
 * compiler records.
 *
 * @throws Error if no type is written and the metadata cannot say it.
 */
export function checkedOf(
  type: RequestType | undefined,
  target: object,
  key: Key,
  index: number,
): Checked {
  if (type === undefined) {
    const owner = ownerOf(target, key);
    return {
      schema: typeFromMetadata(owner, key, index, where(owner, key)),
      optional: false,
    };
  }
  return unwrapped(type);
}

/**
 * Throws unless the compiler recorded the types of the parameters of the
 * method `key` of `prototype`, which it does for every decorated method only
 * when `emitDecoratorMetadata` is on.
 *
 * @throws Error naming the method and the compiler option to turn on.
 */
export function requireMetadata(prototype: object, key: string | symbol): void {
  const owner = ownerOf(prototype, key);
  if (recordedTypes(owner, key) === undefined) {
    throw new Error(
      `${where(owner, key)}: itinera's decorators need the compiler option emitDecoratorMetadata`,
    );
  }
}

/** How a message names the constructor of `owner`, or its method `key`. */
function where(owner: { readonly name: string }, key: Key): string {
  return key === undefined
    ? `the constructor of ${owner.name}`
    : `${owner.name}.${String(key)}`;
}

function ownerOf(target: object, key: Key): Owner {
  return (key === undefined ? target : target.constructor) as Owner;
}

function declaredParameters(owner: Owner, key: Key): number {
  const recorded = recordedTypes(owner, key);
  if (recorded !== undefined) {
    return recorded.length;
  }
  const declared: unknown =
    key === undefined ? owner : Reflect.get(owner.prototype as object, key);
  return typeof declared === "function" ? declared.length : 0;
}

function next(index: number): number {
  return index + 1;
}

function requestAt(
  recorded: ReadonlyMap<number, Request>,
  index: number,
  owner: Owner,
  key: Key,
): Request {
  const request = recorded.get(index);
  if (request === undefined) {
    throw new Error(
      `${where(owner, key)}: parameter ${String(index + 1)} carries no request`,
    );
  }
  return request;
}
