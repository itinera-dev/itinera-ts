import type { Request } from "./declaration/request.js";
import { recordedTypes } from "./declaration/metadata.js";

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
export function record(
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
 * Whether the decorators of `owner` declare a request on a parameter of its
 * constructor, when `key` is `undefined`, or of its method `key`.
 */
export function declaresRequests(owner: Owner, key: Key): boolean {
  return (table.get(owner)?.get(key)?.size ?? 0) > 0;
}

/** The methods of `owner` whose parameters carry a request. */
export function methodsWithRequests(
  owner: Owner,
): readonly (string | symbol)[] {
  return [...(table.get(owner)?.keys() ?? [])].filter(isMethod);
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

/**
 * The requests of the method `key` of the class whose prototype is
 * `prototype`, which `what` names in a message, such as "an input adapter",
 * checked against the kinds of request it may make.
 *
 * @throws Error if the compiler recorded no types, if a parameter has no
 * request, or if one makes a request not `allowed`.
 */
export function requestsMadeBy(
  prototype: object,
  key: string | symbol,
  allowed: readonly Request["kind"][],
  what: string,
): readonly Request[] {
  requireMetadata(prototype, key);
  const owner = ownerOf(prototype, key);
  return onlyAllowed(requestsOf(owner, key), owner, key, allowed, what);
}

/**
 * `requests`, the requests of the method `key` of `owner`, which `what`
 * names in a message, such as "an input adapter", once checked against the
 * kinds of request it may make.
 *
 * @throws Error if one makes a request not `allowed`.
 */
export function onlyAllowed(
  requests: readonly Request[],
  owner: Owner,
  key: string | symbol,
  allowed: readonly Request["kind"][],
  what: string,
): readonly Request[] {
  const refused = requests.find((request) => isRefused(request, allowed));
  if (refused !== undefined) {
    throw new Error(
      `${where(owner, key)}: ${what} cannot request @${refused.kind}`,
    );
  }
  return requests;
}

/** How a message names the constructor of `owner`, or its method `key`. */
export function where(owner: { readonly name: string }, key: Key): string {
  return key === undefined
    ? `the constructor of ${owner.name}`
    : `${owner.name}.${String(key)}`;
}

/**
 * The class a decorator was applied to, from the `target` TypeScript gives
 * it: the class itself for its constructor, its prototype for a method.
 */
export function ownerOf(target: object, key: Key): Owner {
  return (key === undefined ? target : target.constructor) as Owner;
}

/**
 * How many parameters the constructor of `owner`, or its method `key`,
 * declares: as the compiler's metadata records them, or else as the
 * function's length counts them.
 */
export function declaredParameters(owner: Owner, key: Key): number {
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

function isMethod(key: Key): key is string | symbol {
  return key !== undefined;
}

function isRefused(
  request: Request,
  allowed: readonly Request["kind"][],
): boolean {
  return !allowed.includes(request.kind);
}
