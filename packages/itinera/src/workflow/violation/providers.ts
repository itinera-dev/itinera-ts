import type { ProviderName } from "../../service.js";
import type { DeclaredProvider } from "../../service/provider.js";
import type { StepDescriptor, StepName } from "../../step.js";
import type { ViolationKind } from "../violation.js";
import {
  type AttemptRequestInJourneyScope,
  attemptRequestsInJourneyScope,
} from "./scope.js";
import { stepNamed } from "./steps.js";
import { grouped, repeated } from "./tally.js";

/**
 * Two service providers of one workflow have the same name.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface DuplicateProviderName {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.DuplicateProviderName;
  /** The name two providers have. */
  readonly provider: ProviderName;
}

/**
 * A service provider is attached to a step or a rescue step the workflow
 * does not have.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface ServiceProviderForUnknownStep {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.ServiceProviderForUnknownStep;
  /** The provider. */
  readonly provider: ProviderName;
  /** The name it is attached to, which no step or rescue step has. */
  readonly step: string;
}

/**
 * Two providers of one key are both attached to the same step, or both
 * attached to no step.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface ServiceProvidedTwice {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.ServiceProvidedTwice;
  /** The key of the service. */
  readonly key: string;
  /** The step, or the rescue step, they are attached to, if any. */
  readonly step?: StepName;
  /** The providers, in the order they are declared. */
  readonly providers: readonly ProviderName[];
}

/** Where a provider of one key is attached: to a step, or to none. */
interface Attachment<S extends string | undefined = string | undefined> {
  readonly provider: ProviderName;
  readonly key: string;
  readonly step: S;
}

/** What is wrong with `providers`, given the steps of the workflow. */
export function providerViolations(
  steps: readonly StepDescriptor[],
  providers: readonly DeclaredProvider[],
): (
  | DuplicateProviderName
  | ServiceProviderForUnknownStep
  | ServiceProvidedTwice
  | AttemptRequestInJourneyScope
)[] {
  return [
    ...duplicateProviderNames(providers),
    ...providersForUnknownSteps(steps, providers),
    ...servicesProvidedTwice(steps, providers),
    ...attemptRequestsInJourneyScope(providers),
  ];
}

function duplicateProviderNames(
  providers: readonly DeclaredProvider[],
): DuplicateProviderName[] {
  return grouped(providers, nameOf).filter(repeated).map(duplicateProviderName);
}

function providersForUnknownSteps(
  steps: readonly StepDescriptor[],
  providers: readonly DeclaredProvider[],
): ServiceProviderForUnknownStep[] {
  return providers
    .flatMap(attachments)
    .filter((attachment) => isUnknown(steps, attachment))
    .map(providerForUnknownStep);
}

function servicesProvidedTwice(
  steps: readonly StepDescriptor[],
  providers: readonly DeclaredProvider[],
): ServiceProvidedTwice[] {
  const attached = providers.flatMap((provider) =>
    attachmentsToKnownSteps(steps, provider),
  );
  return grouped(attached, attachmentKey)
    .filter(repeated)
    .map(serviceProvidedTwice);
}

function attachments(
  provider: DeclaredProvider,
): readonly Attachment<string>[] {
  return (provider.steps ?? []).map((step) => attachedTo(provider, step));
}

function attachmentsToKnownSteps(
  steps: readonly StepDescriptor[],
  provider: DeclaredProvider,
): readonly Attachment<StepName | undefined>[] {
  return provider.steps === undefined
    ? [attachedTo(provider, undefined)]
    : provider.steps.flatMap((step) => onKnownStep(steps, provider, step));
}

function onKnownStep(
  steps: readonly StepDescriptor[],
  provider: DeclaredProvider,
  name: string,
): readonly Attachment<StepName>[] {
  const step = stepNamed(steps, name);
  return step === undefined ? [] : [attachedTo(provider, step)];
}

function attachedTo<S extends string | undefined>(
  provider: DeclaredProvider,
  step: S,
): Attachment<S> {
  return { provider: provider.name, key: provider.serviceKey, step };
}

function isUnknown(
  steps: readonly StepDescriptor[],
  attachment: Attachment<string>,
): boolean {
  return stepNamed(steps, attachment.step) === undefined;
}

function nameOf(provider: DeclaredProvider): string {
  return provider.name;
}

function attachmentKey(attachment: Attachment): string {
  return JSON.stringify([attachment.key, attachment.step ?? null]);
}

function providerOf(attachment: Attachment): ProviderName {
  return attachment.provider;
}

function duplicateProviderName([provider]: readonly [
  DeclaredProvider,
  ...DeclaredProvider[],
]): DuplicateProviderName {
  return { kind: "duplicate provider name", provider: provider.name };
}

function providerForUnknownStep(
  attachment: Attachment<string>,
): ServiceProviderForUnknownStep {
  return {
    kind: "service provider for unknown step",
    provider: attachment.provider,
    step: attachment.step,
  };
}

function serviceProvidedTwice(
  group: readonly [
    Attachment<StepName | undefined>,
    ...Attachment<StepName | undefined>[],
  ],
): ServiceProvidedTwice {
  const [{ key, step }] = group;
  return {
    kind: "service provided twice",
    key,
    ...(step === undefined ? {} : { step }),
    providers: group.map(providerOf),
  };
}
