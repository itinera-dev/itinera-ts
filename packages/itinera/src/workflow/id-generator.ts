import { type Owner, requestsOf, requireMetadata } from "../declaration.js";
import type { Workflow } from "../workflow.js";
import { declarationOn } from "./registry.js";

/**
 * Marks the method of a workflow class that makes the journey ID of each of
 * its instances, in place of a random UUID. It is called with the workflow
 * object as `this`, while the instance is created, and returns the ID
 * synchronously.
 *
 * {@includeCode ../../examples/id-generator.ts}
 *
 * @throws Error, when the class is defined, if a parameter has no request,
 * if the class has another ID generator, or if the compiler option
 * `emitDecoratorMetadata` is off.
 */
export function idGenerator(): IdGeneratorDecorator {
  return (prototype, key, method) => {
    requireMetadata(prototype, key);
    const generate = method.value;
    if (generate === undefined) {
      throw new Error(`@idGenerator marks a method, not ${String(key)}`);
    }
    requestsOf(prototype.constructor as Owner, key);
    const declaration = declarationOn(prototype.constructor);
    if (declaration.idGenerator !== undefined) {
      throw new Error(
        `${prototype.constructor.name} has more than one ID generator`,
      );
    }
    declaration.idGenerator = generate;
  };
}

/**
 * The decorator {@link idGenerator} makes, which TypeScript calls once, with
 * the method it marks, when the class is defined.
 *
 * {@includeCode ../../examples/id-generator.ts}
 */
export interface IdGeneratorDecorator {
  /**
   * Marks the method `key` of a workflow class, given its prototype.
   *
   * @typeParam M The type of the method, which takes nothing and returns the
   * journey ID.
   */
  <M extends () => string>(
    prototype: Workflow,
    key: string | symbol,
    method: TypedPropertyDescriptor<M>,
  ): void;
}
