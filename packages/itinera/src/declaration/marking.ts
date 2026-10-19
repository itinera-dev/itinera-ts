import type { Checked, Data, Input, Request } from "./request.js";
import {
  declaredParameters,
  declaresRequests,
  type Key,
  type Owner,
  ownerOf,
  record,
  where,
} from "../declaration.js";
import { typeFromMetadata } from "./metadata.js";
import { type RequestType, unwrapped } from "../value/token.js";

/**
 * A parameter decorator, typed as `D`, that records `request` for the
 * parameter it marks, and that a builder may be given by position.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller names the decorator's type, which the compiler checks where it is applied
export function marking<D>(request: Request): D {
  return decorator(() => request, request) as D;
}

/**
 * A parameter decorator, typed as `D`, that records a request of the kind
 * `kind` for the value under `key`, checked by `type`, or else by the type
 * the compiler recorded for the parameter it marks. A builder may be given
 * it by position only when `type` is written.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller names the decorator's type, which the compiler checks where it is applied
export function markingValue<D>(
  kind: Input["kind"] | Data["kind"],
  key: string,
  type: RequestType | undefined,
): D {
  return decorator(
    (target, method, index) => ({
      kind,
      key,
      type: checkedOf(type, target, method, index),
    }),
    type === undefined ? undefined : { kind, key, type: unwrapped(type) },
  ) as D;
}

const positional = new WeakMap<object, Request>();

function decorator(
  requested: (target: object, key: Key, index: number) => Request,
  byPosition: Request | undefined,
): Mark {
  const mark = (target: object, key: Key, index: number): void => {
    record(target, key, index, requested(target, key, index));
  };
  if (byPosition !== undefined) {
    positional.set(mark, byPosition);
  }
  return mark;
}

/** What a parameter decorator is, as TypeScript calls it. */
type Mark = (target: object, key: Key, index: number) => void;

/**
 * The requests a builder was given by position for the parameters of the
 * constructor of `owner`, when `key` is `undefined`, or of its method `key`.
 *
 * @throws Error if the decorators of `owner` declare those requests already,
 * if one given is not a request that writes its type, or if a parameter is
 * left without one.
 */
export function requestsGiven(
  owner: Owner,
  key: Key,
  given: readonly unknown[],
): readonly Request[] {
  if (declaresRequests(owner, key)) {
    throw new Error(
      `${where(owner, key)} declares its requests with decorators, so a builder cannot be given them`,
    );
  }
  const requests = given.map((request, index) =>
    positionalAt(request, index, owner, key),
  );
  if (declaredParameters(owner, key) > requests.length) {
    throw new Error(
      `${where(owner, key)}: parameter ${String(requests.length + 1)} carries no request`,
    );
  }
  return requests;
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

function positionalAt(
  given: unknown,
  index: number,
  owner: Owner,
  key: Key,
): Request {
  const request =
    typeof given === "function" ? positional.get(given) : undefined;
  if (request === undefined) {
    throw new Error(
      `${where(owner, key)}: parameter ${String(index + 1)} is given what is not a request that writes its type`,
    );
  }
  return request;
}
