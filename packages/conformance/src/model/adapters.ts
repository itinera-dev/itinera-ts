import {
  type AdapterDefinition,
  adapterNamed,
  type AdapterScript,
  unboundAdapter,
  unscriptedAdapter,
} from "./adapter.js";
import { attachedTo } from "./attached.js";
import { ModelError } from "./error.js";

/**
 * The input adapters a scenario declares: those the workflow declares with
 * their steps, in the order declared, and those defined before the workflow
 * binds them.
 */
export class InputAdapters {
  /** The adapters the workflow declares, in the order declared or bound. */
  readonly scripts: AdapterScript[] = [];
  readonly #defined: AdapterDefinition[] = [];

  /** Declares an input adapter attached to the steps. */
  declare(name: string, steps: readonly string[]): void {
    this.scripts.push(
      unscriptedAdapter(name, attachedTo("input adapter", name, steps)),
    );
  }

  /**
   * The script of the adapter the workflow declares under the name, or else
   * of the one defined under it, defining it the first time.
   */
  adapter(name: string): AdapterDefinition {
    return (
      this.scripts.find(adapterNamed(name)) ??
      this.#defined.find(adapterNamed(name)) ??
      this.#define(name)
    );
  }

  /**
   * The script of the adapter the workflow declares under the name.
   *
   * @throws ModelError when it declares none.
   */
  declared(name: string): AdapterScript {
    const script = this.scripts.find(adapterNamed(name));
    if (script === undefined) {
      throw new ModelError(`the workflow declares no input adapter "${name}"`);
    }
    return script;
  }

  #define(name: string): AdapterDefinition {
    const defined = unboundAdapter(name);
    this.#defined.push(defined);
    return defined;
  }

  /**
   * Declares in the workflow, attached to the steps, the adapter defined
   * under the name, or else a new one, as "declare" does.
   */
  bind(name: string, steps: readonly string[]): void {
    const at = this.#defined.findIndex(adapterNamed(name));
    const [defined] = at === -1 ? [] : this.#defined.splice(at, 1);
    if (defined === undefined) {
      this.declare(name, steps);
      return;
    }
    this.scripts.push({
      ...defined,
      steps: attachedTo("input adapter", name, steps),
    });
  }

  /**
   * Refuses an adapter defined and never bound, which the workflow would
   * never call.
   *
   * @throws ModelError when one is.
   */
  refuseUnbound(): void {
    const [unbound] = this.#defined;
    if (unbound !== undefined) {
      throw new ModelError(
        `the input adapter "${unbound.name}" is defined but the workflow never binds it`,
      );
    }
  }
}
