import type { JourneyAbort } from "../event.js";

/**
 * Why a journey was aborted, as its result tells it: everything
 * `journey_aborted` tells, its `errorMessage` included, and, when failing
 * custom code caused the abort, what that code threw as `error`, present
 * exactly when `errorMessage` is.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export type Abort = JourneyAbort extends infer Told
  ? Told extends Readonly<Record<"errorMessage", string>>
    ? Told & {
        /** What the custom code that caused the abort threw, as it was thrown. */
        readonly error: unknown;
      }
    : "errorMessage" extends keyof Told
      ? Told &
          (
            | {
                /** The message of what the custom code that caused the abort threw. */
                readonly errorMessage: string;
                /** What the custom code that caused the abort threw, as it was thrown. */
                readonly error: unknown;
              }
            | {
                /** Absent: no custom code caused the abort. */
                readonly errorMessage?: never;
                /** Absent: no custom code caused the abort. */
                readonly error?: never;
              }
          )
      : Told
  : never;
