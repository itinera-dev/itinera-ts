import type { StepDescriptor, StepName } from "../../step.js";
import type { DeclaredAdapter } from "../adapter.js";
import type { AdapterName } from "../names.js";
import type { ViolationKind } from "../violation.js";
import { stepNamed } from "./steps.js";
import { grouped, repeated } from "./tally.js";

/**
 * Two input adapters are attached to the same step, or to the same rescue
 * step.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface StepAdaptedTwice {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.StepAdaptedTwice;
  /** The step, or the rescue step, they are attached to. */
  readonly step: StepName;
  /** The adapters attached to it, in the order they are declared. */
  readonly adapters: readonly AdapterName[];
}

/**
 * Two input adapters of one workflow have the same name.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface DuplicateAdapterName {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.DuplicateAdapterName;
  /** The name two adapters have. */
  readonly adapter: AdapterName;
}

/**
 * An input adapter is attached to a step or a rescue step the workflow does
 * not have.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface InputAdapterForUnknownStep {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.InputAdapterForUnknownStep;
  /** The adapter. */
  readonly adapter: AdapterName;
  /** The name it is attached to, which no step or rescue step has. */
  readonly step: string;
}

/** One step an adapter is attached to, by the name `S` it is given. */
interface Attachment<S extends string = string> {
  readonly adapter: AdapterName;
  readonly step: S;
}

/** Each name that more than one of `adapters` has, once. */
export function duplicateAdapterNames(
  adapters: readonly DeclaredAdapter[],
): DuplicateAdapterName[] {
  return grouped(adapters, nameOf).filter(repeated).map(duplicateAdapterName);
}

/** The attachments of `adapters` to a step `steps` does not have. */
export function adaptersForUnknownSteps(
  steps: readonly StepDescriptor[],
  adapters: readonly DeclaredAdapter[],
): InputAdapterForUnknownStep[] {
  return adapters
    .flatMap(attachments)
    .filter((attachment) => isUnknown(steps, attachment))
    .map(adapterForUnknownStep);
}

/** The steps of `steps` that more than one of `adapters` is attached to. */
export function stepsAdaptedTwice(
  steps: readonly StepDescriptor[],
  adapters: readonly DeclaredAdapter[],
): StepAdaptedTwice[] {
  const known = adapters
    .flatMap(attachments)
    .flatMap((attachment) => onKnownStep(steps, attachment));
  return grouped(known, stepOf).filter(repeated).map(stepAdaptedTwice);
}

function attachments(adapter: DeclaredAdapter): readonly Attachment[] {
  return adapter.steps.map((step) => attachedTo(adapter.name, step));
}

function attachedTo<S extends string>(
  adapter: AdapterName,
  step: S,
): Attachment<S> {
  return { adapter, step };
}

function onKnownStep(
  steps: readonly StepDescriptor[],
  attachment: Attachment,
): readonly Attachment<StepName>[] {
  const step = stepNamed(steps, attachment.step);
  return step === undefined ? [] : [attachedTo(attachment.adapter, step)];
}

function isUnknown(
  steps: readonly StepDescriptor[],
  attachment: Attachment,
): boolean {
  return stepNamed(steps, attachment.step) === undefined;
}

function nameOf(adapter: DeclaredAdapter): string {
  return adapter.name;
}

function stepOf(attachment: Attachment): string {
  return attachment.step;
}

function adapterOf(attachment: Attachment): AdapterName {
  return attachment.adapter;
}

function duplicateAdapterName([adapter]: readonly [
  DeclaredAdapter,
  ...DeclaredAdapter[],
]): DuplicateAdapterName {
  return { kind: "duplicate adapter name", adapter: adapter.name };
}

function adapterForUnknownStep(
  attachment: Attachment,
): InputAdapterForUnknownStep {
  return {
    kind: "input adapter for unknown step",
    adapter: attachment.adapter,
    step: attachment.step,
  };
}

function stepAdaptedTwice(
  group: readonly [Attachment<StepName>, ...Attachment<StepName>[]],
): StepAdaptedTwice {
  return {
    kind: "step adapted twice",
    step: group[0].step,
    adapters: group.map(adapterOf),
  };
}
