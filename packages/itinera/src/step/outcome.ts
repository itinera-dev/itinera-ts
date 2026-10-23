/**
 * What one attempt of a step reports when it ends normally. A step makes it
 * with the helpers of its base class, such as `this.succeed()`, and reports
 * anything abnormal by throwing instead.
 *
 * {@includeCode ../../examples/step.ts}
 */
export type Outcome = Success;

/**
 * The attempt did its work, so what it contributed is committed to the data
 * bag.
 *
 * {@includeCode ../../examples/step.ts}
 */
export interface Success {
  /** Tells this outcome from the others. */
  readonly kind: "success";
}

/** The one success, which every step that succeeds reports. */
export const success: Success = Object.freeze({ kind: "success" });
