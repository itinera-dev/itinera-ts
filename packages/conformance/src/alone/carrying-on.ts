/** A call made on a handle lent to a step or a hook run alone. */
export interface Call {
  /** The handle it was made on. */
  readonly handle: "contributor" | "reporter";
  /** The method called. */
  readonly method: string;
  /** Its first argument: the key of a contribution or an entry, or an event's message. */
  readonly key: unknown;
  /** Whether the call was interrupted, by a throw or a rejection. */
  readonly interrupted: boolean;
}

/** A call as it is recorded, marked once it is interrupted. */
type Recorded = { -readonly [K in keyof Call]: Call[K] };

/**
 * The calls made on the handles lent to a step or a hook run alone, in
 * order. Each handle it lends carries on after a call that is interrupted,
 * as a test would, recording that it was.
 */
export class CarryingOn {
  readonly #calls: Recorded[] = [];

  /** Every call made, in order. */
  get calls(): readonly Call[] {
    return this.#calls;
  }

  /**
   * A copy of `lent`, a handle whose methods are its own properties, each of
   * whose calls is recorded and carries on when interrupted.
   */
  lend<T extends object>(lent: T, handle: Call["handle"]): T {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(lent).map((entry) => this.#recorded(entry, handle)),
      ),
    ) as T;
  }

  #recorded(
    [method, member]: [string, unknown],
    handle: Call["handle"],
  ): [string, unknown] {
    return [method, this.#recording(member, method, handle)];
  }

  #recording(member: unknown, method: string, handle: Call["handle"]): unknown {
    if (typeof member !== "function") {
      return member;
    }
    return (...args: unknown[]) => {
      const call: Recorded = {
        handle,
        method,
        key: args[0],
        interrupted: false,
      };
      this.#calls.push(call);
      return carriedOn(call, () => Reflect.apply(member, undefined, args));
    };
  }
}

/** What the call gives, or nothing once it is interrupted, marking it so. */
function carriedOn(call: Recorded, calling: () => unknown): unknown {
  try {
    const given = calling();
    return given instanceof Promise ? given.catch(interrupting(call)) : given;
  } catch {
    call.interrupted = true;
    return undefined;
  }
}

function interrupting(call: Recorded): () => undefined {
  return () => {
    call.interrupted = true;
    return undefined;
  };
}
