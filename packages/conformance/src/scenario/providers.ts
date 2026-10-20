/**
 * The service providers a scenario declares, given to the builder as the
 * methods of the scenario's workflow class that play them.
 */
import { journeyId } from "itinera/journey";
import { providerReporter } from "itinera/service";
import { attempt, stepName } from "itinera/step";
import { fromWorkflow, type WorkflowBuilder } from "itinera/workflow";
import type { ProviderRequest, ProviderScript } from "../model/provider.js";
import { serviceTypeOf } from "../services.js";
import { requestTypeOf } from "../tokens.js";
import { methodOf, type ProviderMethod, type Scenario } from "./workflow.js";

/**
 * Gives the builder each provider, as the method of its name, with its
 * requests in the order its script declares them, then its provider
 * reporter.
 */
export function provideWith(
  builder: WorkflowBuilder<typeof Scenario, boolean>,
  providers: readonly ProviderScript[],
): void {
  for (const provider of providers) {
    const { name, service, scope, steps, requests } = provider;
    builder.provider<unknown, ProviderMethod>(
      methodOf(name),
      serviceTypeOf(service.type),
      {
        name,
        key: service.key,
        perAttempt: scope === "attempt",
        ...(steps === undefined ? {} : { steps }),
      },
      ...requests.map(requestOf),
      providerReporter(),
    );
  }
}

function requestOf(request: ProviderRequest) {
  switch (request.kind) {
    case "step name":
      return stepName();
    case "attempt number":
      return attempt();
    case "journey ID":
      return journeyId();
    case "data from the workflow":
      return fromWorkflow(
        request.key,
        requestTypeOf(request.type, request.optional),
      );
  }
}
