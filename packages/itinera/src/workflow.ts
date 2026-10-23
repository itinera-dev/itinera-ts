/**
 * Workflows: what a workflow and its parts are called.
 *
 * @module
 */

declare const workflowName: unique symbol;
declare const adapterName: unique symbol;

/**
 * The name of a workflow, which every event of its journeys carries: a
 * string that is never empty, checked when the workflow is declared, so a
 * plain string is not mistaken for one.
 *
 * {@includeCode ../examples/names.ts}
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
 * {@includeCode ../examples/names.ts}
 */
export type AdapterName = string & {
  /** Marks the string as an adapter name made by itinera. */
  readonly [adapterName]: true;
};
