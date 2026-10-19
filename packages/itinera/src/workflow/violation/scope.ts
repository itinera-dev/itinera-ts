import type { Request } from "../../declaration/request.js";
import type { ProviderName } from "../../service.js";
import type { DeclaredProvider } from "../../service/provider.js";
import type { ViolationKind } from "../violation.js";

/**
 * A service provider of journey scope requests the name of the step being
 * built or the attempt.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface AttemptRequestInJourneyScope {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.AttemptRequestInJourneyScope;
  /** The provider. */
  readonly provider: ProviderName;
}

/** The providers of journey scope among `providers` that request the attempt. */
export function attemptRequestsInJourneyScope(
  providers: readonly DeclaredProvider[],
): AttemptRequestInJourneyScope[] {
  return providers.filter(requestsTheAttempt).map(attemptRequestInJourneyScope);
}

function requestsTheAttempt(provider: DeclaredProvider): boolean {
  return (
    provider.scope === "journey" && provider.requests.some(isAboutTheAttempt)
  );
}

function isAboutTheAttempt(request: Request): boolean {
  return request.kind === "attempt" || request.kind === "stepName";
}

function attemptRequestInJourneyScope(
  provider: DeclaredProvider,
): AttemptRequestInJourneyScope {
  return { kind: "attempt request in journey scope", provider: provider.name };
}
