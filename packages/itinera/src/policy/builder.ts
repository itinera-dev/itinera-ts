import { type Owner, where } from "../declaration.js";
import { requestsGiven } from "../declaration/marking.js";
import { named } from "../name.js";
import type { PolicyName } from "../policy.js";
import { checkedHook, isDeclaredPolicy } from "./declared.js";
import {
  type DeclaredHook,
  describePolicy,
  type PolicyClass,
  type PolicyDescriptor,
  type PolicyKind,
} from "./descriptor.js";
import type { Hook } from "./hooks.js";

/** The hooks a policy's builder was given so far. */
export class Hooks {
  readonly #policy: PolicyClass;
  readonly #kind: PolicyKind;
  readonly #name: PolicyName;
  readonly #hooks = new Map<Hook, DeclaredHook>();
  readonly #keys = new Set<string | symbol>();

  /** Starts with no hook, for the policy `name` of the class `policy`. */
  constructor(policy: PolicyClass, kind: PolicyKind, name: PolicyName) {
    this.#policy = policy;
    this.#kind = kind;
    this.#name = name;
  }

  /**
   * Makes the method `key` the policy's `hook`, its parameters making the
   * requests `given`, in order.
   *
   * @throws Error if `key` is not a method of the class, if the hook or the
   * method was given already, or if the requests do not fit the method.
   */
  add(hook: Hook, key: string | symbol, given: readonly unknown[]): void {
    const owner: Owner = this.#policy;
    if (typeof Reflect.get(this.#policy.prototype, key) !== "function") {
      throw new Error(`${where(owner, key)} is not a method of the class`);
    }
    const earlier = this.#hooks.get(hook);
    if (earlier !== undefined) {
      throw new Error(
        `${owner.name} defines ${hook} twice, on ${String(earlier.key)} and on ${String(key)}`,
      );
    }
    if (this.#keys.has(key)) {
      throw new Error(`${where(owner, key)} is given two hooks`);
    }
    this.#keys.add(key);
    this.#hooks.set(
      hook,
      checkedHook(owner, hook, key, requestsGiven(owner, key, given)),
    );
  }

  /** The policy descriptor of the policy, with the hooks given so far. */
  describe(): PolicyDescriptor {
    return describePolicy(this.#policy, this.#kind, this.#name, this.#hooks);
  }
}

/**
 * The name of a policy of the class `policy`, of the kind `kind`, that a
 * policy's builder is started with: `name`, or else the class's name.
 *
 * @throws Error if the name is empty, or if the class is declared with a
 * policy's decorator.
 */
export function checkedName(
  policy: PolicyClass,
  kind: PolicyKind,
  name: string | undefined,
): PolicyName {
  if (isDeclaredPolicy(policy)) {
    throw new Error(
      `${policy.name} is declared with @${kind}Policy: give the class itself`,
    );
  }
  return named<PolicyName>(name ?? policy.name, `policy class ${policy.name}`);
}
