import { useFake, type WorkflowInstance } from "../instance/made.js";
import type { Provided, ServiceType } from "../service.js";
import type { DeclaredProvider } from "../service/provider.js";
import { provided } from "../service/provider/provided.js";
import type { AsValue } from "../value.js";
import type { Workflow } from "../workflow.js";
import { providersOf } from "../workflow/descriptor.js";
import { MistakeKind, TestMistake } from "./mistake.js";

/**
 * What a fake is given to make what it returns, as a provider's
 * `this.provide(...)`: the instance of the service, and, optionally, data
 * for reporters, which `service_provided` carries.
 *
 * {@includeCode ../../examples/fake-provider.ts}
 *
 * @typeParam T The type of the service.
 */
export type Provide<T> = <D = undefined>(
  instance: T,
  data?: D & AsValue<D>,
) => Provided<T>;

/**
 * Puts `fake` in place of the function of the workflow's service provider
 * named `name`, for the journey of `instance` alone, replacing any fake given
 * before for that provider, and returns `instance`.
 *
 * Only the provider's function is replaced. It keeps its scope, the steps it
 * serves and what it requests: the executor still resolves its requests
 * first, so missing data aborts the journey as without a fake, then calls
 * `fake` wherever it would call the provider, once per journey or once per
 * attempt. `fake` returns what `provide` makes, or a promise of it, and a
 * fake that throws, or rejects, aborts the journey as the provider would.
 * `service_provided` names the implementation `fake` made. The workflow's
 * declaration, its admission and its listing are unchanged.
 *
 * {@includeCode ../../examples/fake-provider.ts}
 *
 * @typeParam T The type of the service.
 *
 * @throws TestMistake when the workflow has no service provider named
 * `name`, or when that provider makes another service than `service`.
 */
export function fakeProvider<W extends Workflow, T>(
  instance: WorkflowInstance<W>,
  name: string,
  service: ServiceType<T>,
  fake: (provide: Provide<T>) => Provided<T> | Promise<Provided<T>>,
): WorkflowInstance<W> {
  const replaced = providersOf(instance.descriptor).find(namedAs(name));
  if (replaced === undefined) {
    throw new TestMistake([
      { kind: MistakeKind.UnknownProvider, provider: name },
    ]);
  }
  if (replaced.type !== service) {
    throw new TestMistake([
      { kind: MistakeKind.AnotherService, provider: name },
    ]);
  }
  useFake(instance, replaced.name, () => fake(provided));
  return instance;
}

function namedAs(name: string): (provider: DeclaredProvider) => boolean {
  return (provider) => provider.name === name;
}
