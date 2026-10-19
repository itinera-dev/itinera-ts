/**
 * A sentence that does not fit the scenario, or a value or table cell that
 * cannot be read: an error in the case, never a failure of itinera.
 */
export class ModelError extends Error {
  override readonly name = "ModelError";
}
