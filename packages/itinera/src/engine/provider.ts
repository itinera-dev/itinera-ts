import type { ProviderSource } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { WorkflowInstance } from "../instance.js";
import { fakeOf } from "../instance/made.js";
import type { Result } from "ts-results-es";
import { AbortReason } from "../journey.js";
import { implementationOf } from "../service/implementation.js";
import type { DeclaredProvider } from "../service/provider.js";
import { isProvided } from "../service/provider/provided.js";
import type { PlainValue } from "../value.js";
import { capture, type NotAValue } from "../value/capture.js";
import { Handles } from "./handles.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { whatIs } from "./returned.js";
import { inOrder } from "./order.js";
import { answer, type Calling } from "./provider/answer.js";
import { JourneyAbortError } from "./signal.js";

/**
 * What the provider's method did: returned what `this.provide(...)` makes,
 * with its data captured as it returned, if it supplied any; returned
 * anything else; or threw.
 */
type Called =
  | {
      readonly kind: "provided";
      readonly instance: unknown;
      readonly data: Result<PlainValue, NotAValue> | undefined;
    }
  | { readonly kind: "returned"; readonly returned: unknown }
  | { readonly kind: "threw"; readonly error: unknown };

/**
 * The instance the service provider `provider` makes for the service under
 * `key`, as `source` names the step being built and its attempt, once its
 * own requests are resolved, in the order it declares them, which
 * `service_provided` reports with the implementation it is and the data the
 * provider supplied, captured. A fake a test gave the instance is called
 * instead of the provider's method, once its requests are resolved. Its
 * provider reporter, if it requests one, is closed once the call and every
 * call made on the reporter have settled.
 *
 * @throws JourneyAbortError, aborting the journey when one of its own
 * requests aborts it, before the provider is called; when it was aborted
 * while the provider ran, whatever the provider did afterwards; with `step
 * could not be built`, after `service_provider_failed`, when the provider
 * fails; with `unexpected result` when it returns what `this.provide(...)`
 * does not make; or with `not a value` when the data it supplied is not a
 * value.
 */
export async function providedBy(
  journey: Journey,
  instance: WorkflowInstance,
  provider: DeclaredProvider,
  source: ProviderSource,
  key: string,
): Promise<unknown> {
  const calling: Calling = { journey, instance, provider, source, key };
  const handles = new Handles(journey, source);
  const answers = await inOrder(provider.requests, (request) =>
    answer(calling, handles, request),
  );
  const called = await call(calling, answers);
  await handles.closed();
  const { recorded } = journey;
  if (recorded !== undefined) {
    throw new JourneyAbortError(recorded);
  }
  switch (called.kind) {
    case "threw":
      throw await failed(calling, called.error);
    case "returned":
      throw unexpected(calling, called.returned);
    case "provided": {
      const data = dataOf(calling, called.data);
      await journey.emit({
        kind: EventKind.ServiceProvided,
        step: source.step,
        attempt: source.attempt,
        key,
        provider: provider.name,
        implementation: implementationOf(called.instance, provider.type),
        ...(data === undefined ? {} : { data }),
      });
      return called.instance;
    }
  }
}

async function call(
  { instance, provider, source, key }: Calling,
  answers: readonly unknown[],
): Promise<Called> {
  try {
    const fake = fakeOf(instance, provider.name);
    const returned: unknown = await (fake === undefined
      ? instance.descriptor.provide(
          instance.workflow,
          source.step,
          key,
          answers,
        )
      : fake());
    return isProvided(returned)
      ? {
          kind: "provided",
          instance: returned.instance,
          data:
            returned.data === undefined ? undefined : capture(returned.data),
        }
      : { kind: "returned", returned };
  } catch (error) {
    return { kind: "threw", error };
  }
}

/**
 * Aborts the journey with `unexpected result`, naming the provider and the
 * key, with no event about the provider, since it neither made an instance
 * nor failed.
 */
function unexpected(
  { journey, provider, source, key }: Calling,
  returned: unknown,
): JourneyAbortError {
  return journey.abort({
    reason: AbortReason.UnexpectedResult,
    step: source.step,
    source: { kind: "provider", provider: provider.name, key },
    message: `service provider ${provider.name} returned ${whatIs(returned)}, not what provide() makes`,
  });
}

/**
 * The data the provider supplied with the instance, as it was captured when
 * the provider returned, if it supplied any.
 *
 * @throws JourneyAbortError, aborting the journey with `not a value` when
 * it is not a value.
 */
function dataOf(
  { journey, provider, source }: Calling,
  captured: Result<PlainValue, NotAValue> | undefined,
): PlainValue | undefined {
  if (captured === undefined) {
    return undefined;
  }
  if (captured.isErr()) {
    throw journey.abort({
      reason: AbortReason.NotAValue,
      step: source.step,
      source: { kind: "provider", provider: provider.name },
      eventKind: EventKind.ServiceProvided,
    });
  }
  return captured.value;
}

/**
 * Reports that the provider failed, and aborts the journey with `step could
 * not be built`, naming the provider and carrying `error`, what it threw.
 */
async function failed(
  { journey, provider, source, key }: Calling,
  error: unknown,
): Promise<JourneyAbortError> {
  const { step, attempt } = source;
  await journey.emit({
    kind: EventKind.ServiceProviderFailed,
    step,
    attempt,
    key,
    provider: provider.name,
  });
  return journey.abort({
    reason: AbortReason.StepCouldNotBeBuilt,
    step,
    source: { kind: "provider", provider: provider.name },
    errorMessage: messageOf(error),
    error,
  });
}
