import {
  boolean,
  classOf,
  integer,
  list,
  number,
  object,
  optional,
  type RequestType,
  string,
} from "itinera/value";
import { rejectedRecordGuard, ThrowingRecord } from "./converted.js";
import type { CaseType } from "./model.js";

const tokens = {
  string,
  integer,
  number,
  boolean,
  list,
  object,
  "throwing record": classOf(ThrowingRecord),
  "rejected record": rejectedRecordGuard,
} as const satisfies Readonly<Record<CaseType, unknown>>;

type Token = (typeof tokens)[CaseType];

/**
 * The type token that checks a type the cases name: one of itinera's for a
 * type of the neutral vocabulary, and the runner's own for a converted type.
 */
export function tokenOf(type: CaseType): Token {
  return tokens[type];
}

/** The type of a request for a value of the type, optional or required. */
export function requestTypeOf(
  type: CaseType,
  isOptional: boolean,
): RequestType {
  const token = tokenOf(type);
  return isOptional ? optional(token) : token;
}
