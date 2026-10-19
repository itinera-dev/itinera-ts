import type { PlainValue } from "itinera/unstable";
import { ModelError } from "./error.js";

/** The neutral vocabulary of types the cases name. */
export const valueTypes = [
  "string",
  "integer",
  "number",
  "boolean",
  "list",
  "object",
] as const;

/** A type of the neutral vocabulary. */
export type ValueType = (typeof valueTypes)[number];

/**
 * What a scenario gives: a value, written as JSON, or something that is not
 * a value, which the runner makes as a function.
 */
export type Scripted =
  | { readonly kind: "value"; readonly value: PlainValue }
  | { readonly kind: "non-value" };

/** Something that is not a value, as the cases script it. */
export const nonValue: Scripted = { kind: "non-value" };

/** Reads a type of the neutral vocabulary. */
export function valueType(name: string): ValueType {
  if (!isValueType(name)) {
    throw new ModelError(`"${name}" is not a type of the neutral vocabulary`);
  }
  return name;
}

const known = new Set<string>(valueTypes);

function isValueType(name: string): name is ValueType {
  return known.has(name);
}

/** Reads a value written as JSON. */
export function json(text: string): PlainValue {
  try {
    return JSON.parse(text) as PlainValue;
  } catch {
    throw new ModelError(`${text} is not JSON`);
  }
}

/** A value written as JSON, as what a scenario gives. */
export function scripted(text: string): Scripted {
  return { kind: "value", value: json(text) };
}

/** The entries of a JSON object, in the order written. */
export function entries(text: string): [string, PlainValue][] {
  const value = json(text);
  if (!isObject(value)) {
    throw new ModelError(`${text} is not a JSON object`);
  }
  return Object.entries(value);
}

function isObject(
  value: PlainValue,
): value is { readonly [key: string]: PlainValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
