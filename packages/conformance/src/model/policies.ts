import { ModelError } from "./error.js";
import {
  hookNamed,
  type HookScript,
  type PolicyKind,
  type PolicyScript,
  type Role,
  unscriptedHook,
} from "./policy.js";

/**
 * The policies a scenario declares, by name, in the order declared, which
 * policies the workflow has, and the roles it provides.
 */
export class Policies {
  /** Every policy, by name, in the order first declared. */
  readonly scripts = new Map<string, PolicyScript>();
  /** The workflow policies the workflow has, in order, once stated. */
  workflowHas: readonly string[] | undefined;
  /** The roles the workflow provides, by name. */
  readonly roles = new Map<string, Role>();

  /**
   * Declares that the policy defines the hook, declaring the policy itself
   * the first time.
   *
   * @throws ModelError when the policy is of the other kind, or defines the
   * hook already.
   */
  define(kind: PolicyKind, name: string, hookName: string): void {
    const hook = hookNamed(kind, hookName);
    const script = this.scripts.get(name) ?? { kind, hooks: new Map() };
    if (script.kind !== kind) {
      throw new ModelError(`the policy "${name}" is a ${script.kind} policy`);
    }
    if (script.hooks.has(hook)) {
      throw new ModelError(`the policy "${name}" defines ${hook} already`);
    }
    script.hooks.set(hook, unscriptedHook());
    this.scripts.set(name, script);
  }

  /**
   * The policy declared under the name.
   *
   * @throws ModelError when none is.
   */
  policy(name: string): PolicyScript {
    const script = this.scripts.get(name);
    if (script === undefined) {
      throw new ModelError(`no policy "${name}" is declared`);
    }
    return script;
  }

  /**
   * The script of a hook the policy defines.
   *
   * @throws ModelError when the policy does not define it.
   */
  hook(policy: string, hook: string): HookScript {
    const { kind, hooks } = this.policy(policy);
    const script = hooks.get(hookNamed(kind, hook));
    if (script === undefined) {
      throw new ModelError(`the policy "${policy}" does not define ${hook}`);
    }
    return script;
  }

  /** Says which workflow policies the workflow has, once. */
  attachToWorkflow(policies: readonly string[]): void {
    if (this.workflowHas !== undefined) {
      throw new ModelError("the workflow's policies are already stated");
    }
    this.workflowHas = policies;
  }

  /** Says that the workflow provides the role, with the operation. */
  provide(role: string, operation: string): void {
    const provided = this.roles.get(role) ?? {
      operations: new Set<string>(),
      failing: new Set<string>(),
    };
    provided.operations.add(operation);
    this.roles.set(role, provided);
  }

  /**
   * The role the workflow provides under the name.
   *
   * @throws ModelError when it provides none.
   */
  role(name: string): Role {
    const role = this.roles.get(name);
    if (role === undefined) {
      throw new ModelError(`the workflow provides no role "${name}"`);
    }
    return role;
  }
}
