import type { PolicyDescriptor } from "../../policy/descriptor.js";
import type { ReporterClass } from "../../report.js";
import type { DeclaredProvider } from "../../service/provider.js";
import type { StepDescriptor } from "../../step.js";
import type { WorkflowName } from "../../workflow.js";
import type { DeclaredAdapter } from "../adapter.js";
import { describedAs, type WorkflowDescriptor } from "../descriptor.js";
import type { DeclaredIdGenerator } from "../id-generator.js";
import { Violations, violationsOf } from "../violation.js";

/** The lists a workflow descriptor is made from. */
export interface Parts {
  /** The workflow's name, if it was given one. */
  readonly name: WorkflowName | undefined;
  /** The step descriptors, in the order the steps run. */
  readonly steps: readonly StepDescriptor[];
  /** The classes of the workflow's own reporters. */
  readonly reporters: readonly ReporterClass[];
  /** The workflow policies attached to the workflow, in order. */
  readonly policies: readonly PolicyDescriptor[];
  /** The input adapters, in order. */
  readonly adapters: readonly DeclaredAdapter[];
  /** The service providers, in order. */
  readonly providers: readonly DeclaredProvider[];
  /** The method that makes each instance's journey ID, if there is one. */
  readonly idGenerator: DeclaredIdGenerator | undefined;
}

/**
 * The workflow descriptor made from `parts`, for the workflow class named
 * `className`, once it is checked.
 *
 * @throws Violations listing every violation found.
 * @throws Error if the workflow has no name.
 */
export function assemble(parts: Parts, className: string): WorkflowDescriptor {
  if (parts.name === undefined) {
    throw new Error(
      `workflow ${className} has no name: give it one with @workflow or with its builder's name()`,
    );
  }
  const [first, ...more] = violationsOf(parts);
  if (first !== undefined) {
    throw new Violations([first, ...more]);
  }
  return describedAs(parts.name, parts);
}
