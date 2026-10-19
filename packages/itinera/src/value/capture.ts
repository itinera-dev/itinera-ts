import { Err, Ok, type Result } from "ts-results-es";
import type { PlainValue } from "../value.js";

type Path = readonly (string | number)[];

/** Every reason why what was given is not a value. */
type Problem =
  | "is undefined"
  | "is a function"
  | "is a symbol"
  | "is a bigint"
  | "is not a finite number"
  | "contains itself"
  | "is a list whose prototype is not Array.prototype"
  | "is a list with an empty slot or another property"
  | "is an object whose prototype is not plain"
  | "has a symbol key or a property not enumerable"
  | "threw while it was captured"
  | "is nested too deeply";

/** Why what was given is not a value, and where in it. */
export interface NotAValue {
  readonly path: Path;
  readonly problem: Problem;
}

class Refused extends Error {
  constructor(readonly notAValue: NotAValue) {
    super(notAValue.problem);
  }
}

/**
 * Captures what is given wherever a value enters a journey: turns every object
 * that serialises itself into plain data, checks that the whole is a value,
 * and returns a copy that shares nothing with what was given. Each property is
 * read once. Anything thrown while capturing, by a `toValue()`, a getter or a
 * proxy, makes what was given not a value, and the error is not kept. A value
 * nested more deeply than the call stack allows is refused too.
 */
export function capture(given: unknown): Result<PlainValue, NotAValue> {
  try {
    return Ok(plain(given, [], new Set()));
  } catch (error) {
    return Err(
      error instanceof Refused
        ? error.notAValue
        : { path: [], problem: unexpected(error) },
    );
  }
}

function unexpected(error: unknown): Problem {
  return error instanceof RangeError
    ? "is nested too deeply"
    : "threw while it was captured";
}

function plain(given: unknown, path: Path, enclosing: Set<object>): PlainValue {
  switch (typeof given) {
    case "boolean":
    case "string":
      return given;
    case "number":
      return Number.isFinite(given)
        ? given
        : refuse(path, "is not a finite number");
    case "undefined":
      return refuse(path, "is undefined");
    case "function":
      return refuse(path, "is a function");
    case "symbol":
      return refuse(path, "is a symbol");
    case "bigint":
      return refuse(path, "is a bigint");
    case "object":
      return given === null ? null : plainInside(given, path, enclosing);
  }
}

function plainInside(
  given: object,
  path: Path,
  enclosing: Set<object>,
): PlainValue {
  if (enclosing.has(given)) {
    return refuse(path, "contains itself");
  }
  enclosing.add(given);
  const captured = plainObject(given, path, enclosing);
  enclosing.delete(given);
  return captured;
}

function plainObject(
  given: object,
  path: Path,
  enclosing: Set<object>,
): PlainValue {
  const toValue = guarded<unknown>(path, () => Reflect.get(given, "toValue"));
  if (typeof toValue === "function") {
    const converted = guarded<unknown>(path, () =>
      Reflect.apply(toValue, given, []),
    );
    return plain(converted, path, enclosing);
  }
  if (Array.isArray(given)) {
    return plainList(given, path, enclosing);
  }
  return plainEntries(given, toValue, path, enclosing);
}

function plainList(
  given: readonly unknown[],
  path: Path,
  enclosing: Set<object>,
): readonly PlainValue[] {
  if (prototypeOf(given, path) !== Array.prototype) {
    return refuse(path, "is a list whose prototype is not Array.prototype");
  }
  const length = guarded(path, () => given.length);
  if (ownKeyCount(given, path) !== length + 1) {
    return refuse(path, "is a list with an empty slot or another property");
  }
  return Array.from({ length }, (_, index) =>
    plainItem(given, index, path, enclosing),
  );
}

function plainItem(
  given: readonly unknown[],
  index: number,
  path: Path,
  enclosing: Set<object>,
): PlainValue {
  const itemPath = [...path, index];
  const item = guarded<unknown>(itemPath, () => Reflect.get(given, index));
  return plain(item, itemPath, enclosing);
}

function plainEntries(
  given: object,
  toValue: unknown,
  path: Path,
  enclosing: Set<object>,
): { readonly [key: string]: PlainValue } {
  const prototype = prototypeOf(given, path);
  if (prototype !== Object.prototype && prototype !== null) {
    return refuse(path, "is an object whose prototype is not plain");
  }
  const keys = guarded(path, () => Object.keys(given));
  if (ownKeyCount(given, path) !== keys.length) {
    return refuse(path, "has a symbol key or a property not enumerable");
  }
  return Object.fromEntries(
    keys.map((key) => plainEntry(given, toValue, key, path, enclosing)),
  );
}

function plainEntry(
  given: object,
  toValue: unknown,
  key: string,
  path: Path,
  enclosing: Set<object>,
): [string, PlainValue] {
  const keyPath = [...path, key];
  const read =
    key === "toValue"
      ? toValue
      : guarded<unknown>(keyPath, () => Reflect.get(given, key));
  return [key, plain(read, keyPath, enclosing)];
}

function prototypeOf(given: object, path: Path): unknown {
  return guarded<unknown>(path, () => Object.getPrototypeOf(given));
}

function ownKeyCount(given: object, path: Path): number {
  return guarded(path, () => Reflect.ownKeys(given)).length;
}

function guarded<T>(path: Path, call: () => T): T {
  try {
    return call();
  } catch (error) {
    throw error instanceof Refused
      ? error
      : new Refused({ path, problem: "threw while it was captured" });
  }
}

function refuse(path: Path, problem: Problem): never {
  throw new Refused({ path, problem });
}
