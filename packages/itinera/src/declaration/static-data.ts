/**
 * The class `C` once it keeps no static data: every public static member it
 * adds to those of its base class `B`, its own or inherited, is a function,
 * such as a method. A step, a rescue step or a policy compiles only as such a
 * class, since everything built from it would share a static property holding
 * anything else; the error names the property. A `protected` or `private`
 * static, which no type can see, and a static accessor typed as a function
 * compile, but are refused when the class is declared or its builder is
 * started.
 *
 * {@includeCode ../../examples/static-data.ts}
 *
 * @typeParam C The class.
 * @typeParam B Its base class, such as `typeof Step`.
 */
export type WithoutStaticData<C, B> = C & {
  readonly [
    K in Exclude<keyof C, keyof B> as C[K] extends
      ((...args: never) => unknown) | (abstract new (...args: never) => unknown)
      ? never
      : K
  ]: never;
};

const everyFunction = new Set<string | symbol>(["length", "name", "prototype"]);

/**
 * Refuses the class `target`, which `what` names in a message, such as "step",
 * if it or a class between it and its base class `base` keeps data in a
 * static property: any property but a function, an accessor included, other
 * than what every class has, its built-in `name`, `length` and `prototype`.
 *
 * @throws Error naming each static property that holds data.
 */
export function refuseStaticData(
  target: object & { readonly name: string },
  base: object,
  what: string,
): void {
  const data = staticDataBetween(target, base);
  if (data.length > 0) {
    throw new Error(
      `${what} ${target.name} keeps static data, which everything built from it would share: ${data.join(", ")}`,
    );
  }
}

function staticDataBetween(target: object | null, base: object): string[] {
  if (target === null || target === base || target === Function.prototype) {
    return [];
  }
  const own = Reflect.ownKeys(target)
    .filter((key) => holdsData(target, key))
    .map(String);
  return [...own, ...staticDataBetween(Reflect.getPrototypeOf(target), base)];
}

function holdsData(target: object, key: string | symbol): boolean {
  const property = Reflect.getOwnPropertyDescriptor(target, key);
  return !isBuiltIn(key, property) && typeof property?.value !== "function";
}

function isBuiltIn(
  key: string | symbol,
  property: PropertyDescriptor | undefined,
): boolean {
  return everyFunction.has(key) && property?.writable === false;
}
