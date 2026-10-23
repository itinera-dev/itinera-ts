import type {
  AdapterName,
  JourneyId,
  PolicyName,
  ProviderName,
  StepName,
  WorkflowName,
} from "itinera/unstable";

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
