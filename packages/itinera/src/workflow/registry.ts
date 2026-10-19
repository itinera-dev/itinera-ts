import type { WorkflowPolicyClass } from "../policy.js";
import type { ReporterClass } from "../report.js";
import type { DeclaredProvider } from "../service/provider.js";
import type { StepDescriptor } from "../step.js";
import { Workflow, type WorkflowName } from "../workflow.js";
import type { DeclaredAdapter } from "./adapter.js";
import type { WorkflowDescriptor } from "./descriptor.js";

/**
 * What the decorators of one workflow class declared so far: the lists a
 * workflow descriptor is made from, and the descriptor `@workflow` made from
 * them, once it has.
 */
export interface Declaration {
  /** The workflow's name, once `@workflow` gave it. */
  name: WorkflowName | undefined;
  /** The step descriptors, in the order the decorators are written. */
  readonly steps: StepDescriptor[];
  /** The classes of the workflow's own reporters. */
  reporters: readonly ReporterClass[];
  /** The classes of the workflow policies attached to the workflow. */
  policies: readonly WorkflowPolicyClass[];
  /** The input adapters, in the order their methods are written. */
  readonly adapters: DeclaredAdapter[];
  /** The service providers, in the order their methods are written. */
  readonly providers: DeclaredProvider[];
  /** The method that makes each instance's journey ID, if one is marked. */
  idGenerator: IdGenerator | undefined;
  /** The workflow descriptor `@workflow` made, once it has. */
  descriptor: WorkflowDescriptor | undefined;
}

/** A method of a workflow class that makes a journey ID. */
export type IdGenerator = (this: Workflow) => string;

const declarations = new WeakMap<object, Declaration>();

/** What the decorators of `target` declared so far, empty at first. */
export function declarationOf(target: object): Declaration {
  const known = declarations.get(target);
  if (known !== undefined) {
    return known;
  }
  const declaration: Declaration = {
    name: undefined,
    steps: [],
    reporters: [],
    policies: [],
    adapters: [],
    providers: [],
    idGenerator: undefined,
    descriptor: undefined,
  };
  declarations.set(target, declaration);
  return declaration;
}

/**
 * What the decorators of the workflow class `target` declared so far.
 *
 * @throws Error if `target` does not extend `Workflow` itself.
 */
export function declarationOn(target: { readonly name: string }): Declaration {
  if (Object.getPrototypeOf(target) !== Workflow) {
    throw new Error(`${target.name} must extend Workflow itself`);
  }
  return declarationOf(target);
}
