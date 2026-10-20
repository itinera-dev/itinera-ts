import type { ServiceType } from "./request.js";

/**
 * The implementation `service_provided` names for `instance`, which a
 * provider of the service type `type` made: the name of its class, as the
 * runtime reports it, or the service type's name for an instance with no
 * class of its own, such as a plain object, a function or an instance of an
 * anonymous class. It reads the class and its name without calling a
 * getter, and gives the service type's name when a proxy's trap throws.
 */
export function implementationOf(
  instance: unknown,
  type: ServiceType<unknown>,
): string {
  return classNameOf(instance) ?? type.name;
}

function classNameOf(instance: unknown): string | undefined {
  if (typeof instance !== "object" || instance === null) {
    return undefined;
  }
  try {
    const prototype = Reflect.getPrototypeOf(instance);
    if (prototype === null || prototype === Object.prototype) {
      return undefined;
    }
    const made: unknown = ownValue(prototype, "constructor");
    const name = typeof made === "function" ? ownValue(made, "name") : "";
    return typeof name === "string" && name !== "" ? name : undefined;
  } catch {
    return undefined;
  }
}

/** The value of the property `key` of `target`'s own, read without a getter. */
function ownValue(target: object, key: string): unknown {
  const property = Reflect.getOwnPropertyDescriptor(target, key);
  return property !== undefined && "value" in property
    ? property.value
    : undefined;
}
