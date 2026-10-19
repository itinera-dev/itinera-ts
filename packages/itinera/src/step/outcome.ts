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

const made = new WeakSet<object>();

/** The one success, which every step that succeeds reports. */
export const success: Success = Object.freeze({ kind: "success" });
made.add(success);

/**
 * Whether `returned` is an outcome itinera made, as a step's helpers make
 * them, rather than anything else a cast lets a step return.
 */
export function isOutcome(returned: unknown): returned is Outcome {
  return (
    typeof returned === "object" && returned !== null && made.has(returned)
  );
}
