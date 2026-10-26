import type { JourneyId } from "itinera/journey";
import type { PolicyName } from "itinera/policy";
import type { ProviderName } from "itinera/service";
import type { StepName } from "itinera/step";
import type { AdapterName, WorkflowName } from "itinera/workflow";

export function origin(
  journeyId: JourneyId,
  workflow: WorkflowName,
  step: StepName,
  by?: PolicyName | AdapterName | ProviderName,
): string {
  return by === undefined
    ? `${workflow} ${journeyId}, step ${step}`
    : `${workflow} ${journeyId}, step ${step}, by ${by}`;
}
