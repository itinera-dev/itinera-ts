import type { ProviderSource } from "../../event.js";
import type { WorkflowInstance } from "../../instance.js";
import type {
  DeclaredProvider,
  ProviderRequest,
} from "../../service/provider.js";
import type { Handles } from "../handles.js";
import type { Journey } from "../journey.js";
import { byProvider, requested } from "../request.js";

/** One call of a service provider, for the service under `key` of an attempt. */
export interface Calling {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly provider: DeclaredProvider;
  /** The provider, with the step being built and its attempt. */
  readonly source: ProviderSource;
  /** The key of the service. */
  readonly key: string;
}

/**
 * What the provider's request `request` is answered with: the journey ID,
 * data from the workflow read from the data bag, its provider reporter from
 * `handles`, the name of the step being built or its attempt.
 *
 * @throws JourneyAbortError when data from the workflow it requires is
 * missing or of another type.
 */
export async function answer(
  { journey, instance, provider, source }: Calling,
  handles: Handles,
  request: ProviderRequest,
): Promise<unknown> {
  switch (request.kind) {
    case "journeyId":
      return instance.journeyId;
    case "fromWorkflow":
      return requested(
        journey,
        byProvider(provider.name, source.step, source.attempt),
        request.key,
        request.type,
        journey.data.get(request.key),
      );
    case "providerReporter":
      return handles.reporter;
    case "stepName":
      return source.step;
    case "attempt":
      return source.attempt;
  }
}
