import type { PlainValue } from "itinera/value";
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

/**
 * The converted types: types of the runner's own, standing for classes of an
 * application, whose value conversions the runner scripts.
 */
export const convertedTypes = ["throwing record", "rejected record"] as const;

/** Every type the cases name: the neutral vocabulary, then the converted types. */
export const caseTypes = [...valueTypes, ...convertedTypes] as const;

/** A type the cases name: of the neutral vocabulary, or a converted type. */
export type CaseType = (typeof caseTypes)[number];

/**
 * What a scenario gives: a value, written as JSON, something that is not a
 * value, which the runner makes as a function, or an object of the converted
 * type `throwing record`.
 */
export type Scripted =
  | { readonly kind: "value"; readonly value: PlainValue }
  | { readonly kind: "non-value" }
  | { readonly kind: "throwing record" };

/** Something that is not a value, as the cases script it. */
export const nonValue: Scripted = { kind: "non-value" };

/** An object of the converted type `throwing record`, as the cases script it. */
export const aThrowingRecord: Scripted = { kind: "throwing record" };

/** Reads a type the cases name. */
export function caseType(name: string): CaseType {
  if (!isCaseType(name)) {
    throw new ModelError(`"${name}" is not a type the cases name`);
  }
  return name;
}

const known = new Set<string>(caseTypes);

function isCaseType(name: string): name is CaseType {
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

/**
 * What a sentence writes in the place of a value: "a non-value", "a throwing
 * record", or a value written as JSON.
 */
export function written(text: string): Scripted {
  switch (text) {
    case "a non-value":
      return nonValue;
    case "a throwing record":
      return aThrowingRecord;
    default:
      return scripted(text);
  }
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
