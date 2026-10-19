import "reflect-metadata";

/**
 * Throws unless the compiler recorded the types of the parameters of the
 * method `key` of `prototype`, which it does for every decorated method only
 * when `emitDecoratorMetadata` is on.
 *
 * @throws Error naming the method and the compiler option to turn on.
 */
export function requireMetadata(prototype: object, key: string | symbol): void {
  if (Reflect.getMetadata("design:paramtypes", prototype, key) === undefined) {
    throw new Error(
      `${methodName(prototype, key)}: itinera's decorators need the compiler option emitDecoratorMetadata`,
    );
  }
}

/**
 * Throws if the constructor of the class `target` declares a parameter, since
 * none can carry a request yet.
 *
 * @throws Error naming the class.
 */
export function refuseConstructorParameters(
  target: abstract new (...args: never[]) => unknown,
): void {
  const recorded: unknown = Reflect.getMetadata("design:paramtypes", target);
  if (parameters(recorded, target.length) > 0) {
    throw new Error(
      `the constructor of ${target.name} has a parameter with no request`,
    );
  }
}

/**
 * Throws if the method `key` of `prototype` declares a parameter, since none
 * can carry a request yet.
 *
 * @throws Error naming the method.
 */
export function refuseMethodParameters(
  prototype: object,
  key: string | symbol,
): void {
  const recorded: unknown = Reflect.getMetadata(
    "design:paramtypes",
    prototype,
    key,
  );
  const method: unknown = Reflect.get(prototype, key);
  const length = typeof method === "function" ? method.length : 0;
  if (parameters(recorded, length) > 0) {
    throw new Error(
      `${methodName(prototype, key)} has a parameter with no request`,
    );
  }
}

/**
 * How many parameters a function declares: as many as the compiler recorded
 * types for, or else its `length`, which leaves out a parameter with a
 * default value and a rest parameter.
 */
function parameters(recorded: unknown, length: number): number {
  return Array.isArray(recorded) ? recorded.length : length;
}

function methodName(prototype: object, key: string | symbol): string {
  return `${prototype.constructor.name}.${String(key)}`;
}
