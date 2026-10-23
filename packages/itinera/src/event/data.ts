import type { FixedFields, StepFields } from "./fields.js";
import type { ContributionSource, MetadataSource } from "./source.js";

/**
 * A step, a hook or a service provider set an entry of the journey's global
 * metadata, after the reporters received it. The value is never carried:
 * reporters already have it.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface GlobalMetadataSet extends FixedFields<"global_metadata_set"> {
  /** The entry's key. */
  readonly key: string;
  /** Who set it. */
  readonly source: MetadataSource;
}

/**
 * A contribution reached the data bag.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface ContributionCommitted extends FixedFields<"contribution_committed"> {
  /** The contribution's key. */
  readonly key: string;
  /** Who contributed it. */
  readonly source: ContributionSource;
}

/**
 * A skipped step's contributions were discarded.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type ContributionsDiscarded = StepFields<"contributions_discarded">;

/**
 * A committed key replaced an earlier value.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface DataOverwritten extends FixedFields<"data_overwritten"> {
  /** The key. */
  readonly key: string;
  /** Who contributed the new value. */
  readonly source: ContributionSource;
}
