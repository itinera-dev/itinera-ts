import type { Input } from "../declaration/request.js";
import { EventKind } from "../event/kind.js";
import { AbortReason } from "../journey.js";
import { dataBagFor } from "../journey/data-bag.js";
import { None, type Option, Some } from "../option.js";
import type { Attempt, StepName } from "../step.js";
import type { PlainValue } from "../value.js";
import { capture } from "../value/capture.js";
import type { WorkflowInstance } from "../instance.js";
import type { AdapterRequest, DeclaredAdapter } from "../workflow/adapter.js";
import { isSupplied } from "../workflow/adapter/supplied.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { inOrder } from "./order.js";
import { byAdapter, requested } from "./request.js";
import type { JourneyAbortError } from "./signal.js";

/** An input of a step being built for an attempt, which its input adapter is asked for. */
interface Asking {
  /** The step's name. */
  readonly step: StepName;
  /** The attempt it is built for. */
  readonly attempt: Attempt;
  /** The input. */
  readonly input: Input;
}

/**
 * Asks the input adapter `adapter` for one input of a step being built,
 * once its own requests are resolved, in the order it declares them: `Some`
 * of the value it supplied, captured, which `input_adapter_supplied`
 * reports, or `None` when it returned that the input comes from the data
 * bag. Its access to the data bag, if it requests one, shows nothing once
 * the call has returned.
 *
 * @throws JourneyAbortError, aborting the journey when one of its own
 * requests aborts it, or with `step could not be built`, after
 * `input_adapter_failed`, when it fails, returns what itinera's helpers do
 * not make, or supplies what is not a value.
 */
export async function adapted(
  journey: Journey,
  instance: WorkflowInstance,
  adapter: DeclaredAdapter,
  asking: Asking,
): Promise<Option<PlainValue>> {
  const access = dataBagFor(journey.data);
  const calling: Calling = { journey, instance, adapter, asking, access };
  try {
    const answers = await inOrder(adapter.requests, (request) =>
      answer(calling, request),
    );
    return await called(calling, answers);
  } finally {
    access.close();
  }
}

/** One call of an input adapter, for one input of a step being built. */
interface Calling {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly adapter: DeclaredAdapter;
  readonly asking: Asking;
  readonly access: ReturnType<typeof dataBagFor>;
}

async function answer(
  { journey, instance, adapter, asking, access }: Calling,
  request: AdapterRequest,
): Promise<unknown> {
  switch (request.kind) {
    case "stepName":
      return asking.step;
    case "key":
      return asking.input.key;
    case "journeyId":
      return instance.journeyId;
    case "dataBag":
      return access.dataBag;
    case "fromWorkflow":
      return requested(
        journey,
        byAdapter(adapter.name, asking.step, asking.attempt),
        request.key,
        request.type,
        journey.data.get(request.key),
      );
  }
}

/**
 * Calls the adapter with `answers`, and turns what it returns into the value
 * it supplied, captured, if it supplied one.
 */
async function called(
  { journey, instance, adapter, asking }: Calling,
  answers: readonly unknown[],
): Promise<Option<PlainValue>> {
  let returned: unknown;
  try {
    returned = await instance.descriptor.adapt(
      instance.workflow,
      asking.step,
      answers,
    );
  } catch (error) {
    throw await failed(journey, adapter, asking, Some(error));
  }
  if (!isSupplied(returned)) {
    throw await failed(
      journey,
      adapter,
      asking,
      Some(
        new TypeError(
          `input adapter ${adapter.name} returned ${typeof returned}, not what supply() or fromDataBag() make`,
        ),
      ),
    );
  }
  if (returned.kind === "fromDataBag") {
    return None;
  }
  const value = capture(returned.value);
  if (value.isErr()) {
    throw await failed(journey, adapter, asking, None);
  }
  await journey.emit({
    kind: EventKind.InputAdapterSupplied,
    step: asking.step,
    attempt: asking.attempt,
    key: asking.input.key,
    adapter: adapter.name,
  });
  return Some(value.value);
}

/**
 * Reports that the adapter failed for the input, or supplied what is not a
 * value, and aborts the journey with `step could not be built`, carrying
 * the error, if one made it fail.
 */
async function failed(
  journey: Journey,
  adapter: DeclaredAdapter,
  { step, attempt, input }: Asking,
  thrown: Option<unknown>,
): Promise<JourneyAbortError> {
  await journey.emit({
    kind: EventKind.InputAdapterFailed,
    step,
    attempt,
    key: input.key,
    adapter: adapter.name,
  });
  const source = {
    kind: "adapter",
    adapter: adapter.name,
    key: input.key,
  } as const;
  return journey.abort(
    thrown.isNone()
      ? { reason: AbortReason.StepCouldNotBeBuilt, step, source }
      : {
          reason: AbortReason.StepCouldNotBeBuilt,
          step,
          source,
          errorMessage: messageOf(thrown.value),
          error: thrown.value,
        },
  );
}
