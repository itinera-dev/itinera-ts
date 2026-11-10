import { attachedTo } from "../attached.js";
import { ModelError } from "../error.js";
import type {
  ProviderFailure,
  ProviderScript,
  ServiceRequest,
} from "../provider.js";

/**
 * The service providers a scenario declares, in the order declared, and
 * which of them are only defined, waiting for the workflow to bind them.
 */
export class Providers {
  /** Every provider, in the order declared, two of one name included. */
  readonly scripts: ProviderScript[] = [];
  readonly #unbound: ProviderScript[] = [];

  /** Declares a service provider that does nothing else yet. */
  declare(
    name: string,
    service: ServiceRequest,
    scope: ProviderScript["scope"],
  ): void {
    this.scripts.push(unscriptedProvider(name, service, scope));
  }

  /** Defines a service provider that does nothing else yet, for the workflow to bind. */
  define(
    name: string,
    service: ServiceRequest,
    scope: ProviderScript["scope"],
  ): void {
    this.#unbound.push(unscriptedProvider(name, service, scope));
  }

  /**
   * Declares in the workflow the provider defined first under the name and
   * not bound yet, attached to the steps when some are given.
   *
   * @throws ModelError when no provider of that name waits to be bound.
   */
  bind(name: string, steps: readonly string[] = []): void {
    const at = this.#unbound.findIndex((defined) => isNamed(defined, name));
    const [script] = at === -1 ? [] : this.#unbound.splice(at, 1);
    if (script === undefined) {
      throw new ModelError(
        `no service provider "${name}" is defined and waiting to be bound`,
      );
    }
    this.scripts.push(script);
    if (steps.length > 0) {
      script.steps = attachedTo("service provider", name, steps);
    }
  }

  /**
   * Refuses a provider defined and never bound, which the workflow would
   * never declare.
   *
   * @throws ModelError when one is.
   */
  refuseUnbound(): void {
    const [unbound] = this.#unbound;
    if (unbound !== undefined) {
      throw new ModelError(
        `the service provider "${unbound.name}" is defined but the workflow never binds it`,
      );
    }
  }

  /**
   * The provider declared first under the name, or else the one defined
   * first under it and not bound yet.
   *
   * @throws ModelError when none is.
   */
  provider(name: string): ProviderScript {
    const script =
      this.scripts.find((declared) => isNamed(declared, name)) ??
      this.#unbound.find((defined) => isNamed(defined, name));
    if (script === undefined) {
      throw new ModelError(
        `the workflow declares no service provider "${name}"`,
      );
    }
    return script;
  }

  /** Attaches the provider to the steps, one or more. */
  attach(name: string, steps: readonly string[]): void {
    this.provider(name).steps = attachedTo("service provider", name, steps);
  }

  /** Says how the provider fails, once. */
  fails(name: string, failure: ProviderFailure): void {
    const script = this.provider(name);
    if (script.failure !== undefined) {
      throw new ModelError(
        `how the service provider "${name}" fails is already stated`,
      );
    }
    script.failure = failure;
  }
}

function unscriptedProvider(
  name: string,
  service: ServiceRequest,
  scope: ProviderScript["scope"],
): ProviderScript {
  return {
    name,
    service,
    scope,
    requests: [],
    actions: [],
    implementation: "first labeller",
    asynchronous: false,
  };
}

function isNamed(script: ProviderScript, name: string): boolean {
  return script.name === name;
}
