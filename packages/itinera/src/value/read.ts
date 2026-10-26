import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { z } from "zod";
import { None, type Option, Some } from "../option.js";
import type { PlainValue } from "../value.js";
import { classCarriedBy } from "./token.js";

/**
 * What a request or a read of type `schema` receives for the value `stored`:
 * its own copy, once `schema` accepts it, with an instance made by
 * `fromValue` wherever `classOf` names a class, at the top or inside a list,
 * an object or one of their optional or nullable parts. `None` when the value
 * is of another type: when the schema refuses it, throws, or checks it
 * asynchronously, or when a `fromValue` throws.
 *
 * The schema's own output is never given, so a schema that converts what it
 * checks cannot change what is received.
 */
export function received(
  stored: PlainValue,
  schema: StandardSchemaV1,
): Option<unknown> {
  const copy = structuredClone(stored);
  try {
    return isAccepted(schema["~standard"].validate(copy))
      ? Some(converted(schema, copy))
      : None;
  } catch {
    return None;
  }
}

function isAccepted(
  checked: StandardSchemaV1.Result<unknown> | Promise<unknown>,
): boolean {
  if (isThenable(checked)) {
    Promise.resolve(checked).catch(ignored);
    return false;
  }
  return checked.issues === undefined;
}

function isThenable(checked: object): checked is PromiseLike<unknown> {
  return "then" in checked && typeof checked.then === "function";
}

function ignored(): void {
  // A check that settles later cannot answer a read, which is synchronous.
}

function converted(schema: StandardSchemaV1, value: PlainValue): unknown {
  const type = classCarriedBy(schema);
  if (type !== undefined) {
    return type.fromValue(value);
  }
  return isZod(schema) ? convertedInside(schema, value) : value;
}

function convertedInside(schema: z.core.$ZodTypes, value: PlainValue): unknown {
  const { def } = schema._zod;
  if (def.type === "array" && isList(value)) {
    return value.map((item) => converted(def.element, item));
  }
  if (def.type === "object" && isObject(value)) {
    return convertedEntries(def.shape, value);
  }
  if (def.type === "optional" || (def.type === "nullable" && value !== null)) {
    return converted(def.innerType, value);
  }
  return value;
}

function convertedEntries(
  shape: Readonly<Record<string, z.core.$ZodType>>,
  value: Readonly<Record<string, PlainValue>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map((entry) => convertedEntry(shape, entry)),
  );
}

function convertedEntry(
  shape: Readonly<Record<string, z.core.$ZodType>>,
  [key, item]: readonly [string, PlainValue],
): [string, unknown] {
  const type = Object.hasOwn(shape, key) ? shape[key] : undefined;
  return [key, type === undefined ? item : converted(type, item)];
}

function isList(value: PlainValue): value is readonly PlainValue[] {
  return Array.isArray(value);
}

function isObject(
  value: PlainValue,
): value is Readonly<Record<string, PlainValue>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isZod(schema: StandardSchemaV1): schema is z.core.$ZodTypes {
  return "_zod" in schema;
}
