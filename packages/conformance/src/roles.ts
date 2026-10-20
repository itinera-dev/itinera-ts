/**
 * The roles the scenario's workflow provides, as its hooks reach them
 * through the workflow object: each operation counts its calls, and throws
 * when the scenario says it does.
 */
import type { Role } from "./model/policy.js";

/** The operations of the roles the workflow provides, and how often each was called. */
export class Roles {
  readonly #provided: ReadonlyMap<string, Role>;
  readonly #calls = new Map<string, number>();

  constructor(provided: ReadonlyMap<string, Role>) {
    this.#provided = provided;
  }

  /**
   * Calls the operation of the role, counting the call.
   *
   * @throws Error when the workflow does not provide it, or when the
   * scenario says it throws.
   */
  perform(role: string, operation: string): void {
    const provided = this.#provided.get(role);
    if (provided?.operations.has(operation) !== true) {
      throw new Error(
        `the workflow provides no operation "${operation}" of the role "${role}"`,
      );
    }
    const key = keyOf(role, operation);
    this.#calls.set(key, this.called(role, operation) + 1);
    if (provided.failing.has(operation)) {
      throw new Error(
        `the operation "${operation}" of the role "${role}" failed`,
      );
    }
  }

  /** How many times the operation of the role was called, in every journey. */
  called(role: string, operation: string): number {
    return this.#calls.get(keyOf(role, operation)) ?? 0;
  }
}

/** What the workflow object a hook requests as a role offers: the roles' operations. */
export interface Performer {
  perform(role: string, operation: string): void;
}

/** Whether what a hook received as a role is the scenario's workflow object. */
export function isPerformer(received: unknown): received is Performer {
  return (
    typeof received === "object" &&
    received !== null &&
    "perform" in received &&
    typeof received.perform === "function"
  );
}

function keyOf(role: string, operation: string): string {
  return JSON.stringify([role, operation]);
}
