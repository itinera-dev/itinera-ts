import {
  boolean,
  integer,
  list,
  number,
  object,
  optional,
  type RequestType,
  string,
} from "itinera/value";
import type { ValueType } from "./model.js";

const tokens = {
  string,
  integer,
  number,
  boolean,
  list,
  object,
} as const satisfies Readonly<Record<ValueType, unknown>>;

type Token = (typeof tokens)[ValueType];

/** The type token of itinera that checks a type of the neutral vocabulary. */
export function tokenOf(type: ValueType): Token {
  return tokens[type];
}

/** The type of a request for a value of the type, optional or required. */
export function requestTypeOf(
  type: ValueType,
  isOptional: boolean,
): RequestType {
  const token = tokenOf(type);
  return isOptional ? optional(token) : token;
}
