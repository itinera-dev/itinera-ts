import {
  type Owner,
  ownerOf,
  requestsOf,
  requireMetadata,
  where,
} from "../declaration.js";
import type { Request } from "./request.js";

/**
 * The requests of the method `key` of the class whose prototype is
 * `prototype`, which `what` names in a message, such as "an input adapter",
 * checked against the kinds of request it may make.
 *
 * @throws Error if the compiler recorded no types, if a parameter has no
 * request, or if one makes a request not `allowed`.
 */
export function requestsMadeBy<K extends Request["kind"]>(
  prototype: object,
  key: string | symbol,
  allowed: readonly K[],
  what: string,
): readonly RequestOf<K>[] {
  requireMetadata(prototype, key);
  const owner = ownerOf(prototype, key);
  return onlyAllowed(requestsOf(owner, key), owner, key, allowed, what);
}

/** A request of one of the kinds `K`. */
export type RequestOf<K extends Request["kind"]> = Request & {
  readonly kind: K;
};

/**
 * `requests`, the requests of the method `key` of `owner`, which `what`
 * names in a message, such as "an input adapter", once checked against the
 * kinds of request it may make.
 *
 * @throws Error if one makes a request not `allowed`.
 */
export function onlyAllowed<K extends Request["kind"]>(
  requests: readonly Request[],
  owner: Owner,
  key: string | symbol,
  allowed: readonly K[],
  what: string,
): readonly RequestOf<K>[] {
  const refused = requests.find((request) => isRefused(request, allowed));
  if (refused !== undefined) {
    throw new Error(
      `${where(owner, key)}: ${what} cannot request @${refused.kind}`,
    );
  }
  return requests.filter((request) => isAllowed(request, allowed));
}

function isRefused(
  request: Request,
  allowed: readonly Request["kind"][],
): boolean {
  return !isAllowed(request, allowed);
}

function isAllowed<K extends Request["kind"]>(
  request: Request,
  allowed: readonly K[],
): request is RequestOf<K> {
  return isKindIn(request.kind, allowed);
}

function isKindIn(
  kind: Request["kind"],
  allowed: readonly Request["kind"][],
): boolean {
  return allowed.includes(kind);
}
