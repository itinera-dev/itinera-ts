import type { InitialValues, Refused } from "./refusal/refused.js";

export type * from "./refusal/refused.js";

/**
 * What `run` rejects with when it refuses an instance, before any journey
 * starts and before any event: `refused` says why. When failing custom code
 * caused it, the error is also its standard `cause`.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export class Refusal extends Error {
  /** Names the kind of error, as every error's `name` does. */
  override readonly name = "Refusal";

  /** Why `run` refused the instance. */
  readonly refused: Refused;

  /** The refusal of an instance, for the reason `refused` gives. */
  constructor(refused: Refused) {
    super(
      messageOf(refused),
      "error" in refused ? { cause: refused.error } : undefined,
    );
    this.refused = refused;
  }
}

function messageOf(refused: Refused): string {
  switch (refused.kind) {
    case "instance ran":
      return "run refused an instance that already ran: make an instance for each journey";
    case "journey running":
      return "run refused an instance while the executor runs a journey: wait for it, or run on another executor";
    case "initial values":
      return `run refused an instance: ${initialValues(refused)}`;
    case "workflow policy failed":
      return `run refused an instance: workflow policy ${refused.policy} failed while it was built: ${refused.errorMessage}`;
    case "dispatcher factory failed":
      return `run refused an instance: the dispatcher factory failed: ${refused.errorMessage}`;
    case "dispatcher failed":
      return `run refused an instance: the dispatcher failed while the reporters were added: ${refused.errorMessage}`;
    case "global metadata not set":
      return `run refused an instance: the global metadata could not be set: ${refused.errorMessage}`;
    case "unexpected result":
      return `run refused an instance: ${refused.message}`;
  }
}

function initialValues(refused: InitialValues): string {
  return [
    listed("the initial data is not a value under", refused.initialData),
    listed(
      "the initial global metadata is not a value, or is reserved, under",
      refused.initialGlobalMetadata,
    ),
  ]
    .filter(isSaid)
    .join("; ");
}

function listed(what: string, keys: readonly string[]): string {
  return keys.length === 0 ? "" : `${what} ${keys.join(", ")}`;
}

function isSaid(text: string): boolean {
  return text !== "";
}
