import "reflect-metadata";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  boolean,
  classOf,
  number,
  string,
  type ValueClass,
} from "../value/token.js";
import type { Key, Owner } from "../declaration.js";

/**
 * The schema of the declared type of the parameter at `index` of the
 * constructor of `owner`, when `key` is `undefined`, or of its method `key`,
 * as the compiler recorded it: `number`, `string`, `boolean`, or a class with
 * a static `fromValue`, read back with `classOf`.
 *
 * @throws Error, naming the parameter with `where`, if the compiler recorded
 * no types, or a type of which it cannot say more, such as `Object` for an
 * interface or a union.
 */
export function typeFromMetadata(
  owner: Owner,
  key: Key,
  index: number,
  where: string,
): StandardSchemaV1 {
  const recorded = recordedTypes(owner, key);
  if (recorded === undefined) {
    throw new Error(
      `${where}: a request that writes no type needs the compiler option emitDecoratorMetadata`,
    );
  }
  const declared: unknown = recorded[index];
  if (declared === Number) {
    return number;
  }
  if (declared === String) {
    return string;
  }
  if (declared === Boolean) {
    return boolean;
  }
  if (isValueClass(declared)) {
    return classOf(declared);
  }
  throw new Error(
    `${where}: the type of parameter ${String(index + 1)} cannot be read from the metadata, so its request must write it`,
  );
}

function isValueClass(declared: unknown): declared is ValueClass {
  return (
    typeof declared === "function" &&
    typeof Reflect.get(declared, "fromValue") === "function"
  );
}

/**
 * The declared types of the parameters of the constructor of `owner`, when
 * `key` is `undefined`, or of its method `key`, as the compiler recorded
 * them, or `undefined` when it recorded none.
 */
export function recordedTypes(
  owner: Owner,
  key: Key,
): readonly unknown[] | undefined {
  const recorded: unknown =
    key === undefined
      ? Reflect.getMetadata("design:paramtypes", owner)
      : Reflect.getMetadata(
          "design:paramtypes",
          owner.prototype as object,
          key,
        );
  return Array.isArray(recorded) ? recorded : undefined;
}
