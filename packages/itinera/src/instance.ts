/**
 * Workflow instances: one per journey, holding its workflow, its initial
 * data, its journey ID, its reporters and its initial global metadata.
 *
 * {@includeCode ../examples/instance.ts}
 *
 * @module itinera/instance
 */
import type { JourneyId } from "./journey.js";
import type { Reporter } from "./report.js";
import type { Value } from "./value.js";

export type { WorkflowInstance } from "./instance/made.js";

/**
 * Values by key, given as a `Map`, as entries, or as a plain object, whose
 * properties set to `undefined` are left out. A plain object puts keys that
 * look like whole numbers first, whatever the order they were written in, so
 * give a `Map` or entries when such keys must keep their order.
 *
 * {@includeCode ../examples/workflow.ts}
 */
export type ValuesByKey =
  | ReadonlyMap<string, Value>
  | Iterable<readonly [string, Value]>
  | { readonly [key: string]: Value | undefined };

/**
 * What an instance holds besides its initial data.
 *
 * {@includeCode ../examples/instance.ts}
 */
export interface InstanceOptions {
  /**
   * The instance's own reporters, added after those its workflow lists: each
   * a reporter, or a function that makes one from the instance's journey ID.
   */
  readonly reporters?: readonly (
    Reporter | ((journeyId: JourneyId) => Reporter)
  )[];
  /**
   * The initial global metadata, passed to every reporter after the journey
   * ID and before the journey starts, checked when the instance is run.
   */
  readonly reportersGlobalMetadata?: ValuesByKey;
}
