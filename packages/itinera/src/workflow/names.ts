import type { Workflow } from "../workflow.js";

declare const workflowName: unique symbol;
declare const adapterName: unique symbol;
declare const built: unique symbol;

/**
 * The name of a workflow, which every event of its journeys carries: a
 * string that is never empty, checked when the workflow is declared, so a
 * plain string is not mistaken for one.
 *
 * {@includeCode ../../examples/names.ts}
 */
export type WorkflowName = string & {
  /** Marks the string as a workflow name made by itinera. */
  readonly [workflowName]: true;
};

/**
 * The name of an input adapter, which supplies a step's input in place of the
 * data bag: a string that is never empty, checked when the workflow is
 * declared.
 *
 * {@includeCode ../../examples/names.ts}
 */
export type AdapterName = string & {
  /** Marks the string as an adapter name made by itinera. */
  readonly [adapterName]: true;
};

/**
 * A workflow object made by `build()`, which holds its checked workflow
 * descriptor, and so can make instances. Only itinera makes one: an object
 * made with `new` is not one.
 *
 * {@includeCode ../../examples/workflow.ts}
 */
export type Built<W extends Workflow> = W & {
  /** Marks the object as made by `build()`. */
  readonly [built]: true;
};
