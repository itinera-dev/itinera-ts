import type { JourneyId } from "../journey.js";
import type { Abort } from "./abort.js";
import type { DataBag } from "./data-bag.js";
import type { Failure } from "./failure.js";
import {
  type Output,
  OutputError,
  type OutputShape,
  outputOf,
} from "./output.js";

/**
 * How a journey ended: succeeded or failed, each with its data bag, or
 * aborted, with no data bag, since an abort is a fault and the data bag may
 * stand halfway through a change.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export type JourneyStatus = Succeeded | Failed | Aborted;

/**
 * The journey succeeded.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export interface Succeeded {
  /** Tells this status from the others. */
  readonly kind: "succeeded";
  /** The data bag as it stood at the end: the journey's output. */
  readonly dataBag: DataBag;
}

/**
 * The journey failed.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export interface Failed {
  /** Tells this status from the others. */
  readonly kind: "failed";
  /** Why it failed. */
  readonly failure: Failure;
  /** The data bag as it stood at the end: the journey's output. */
  readonly dataBag: DataBag;
}

/**
 * The journey was aborted: something illegal happened, typically code that
 * did not handle an error as it should.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export interface Aborted {
  /** Tells this status from the others. */
  readonly kind: "aborted";
  /** Why it was aborted. */
  readonly abort: Abort;
}

/**
 * What running a journey gives: its journey ID and how it ended, its
 * business outcome. Each step's status and the name of the step that failed
 * are not in it, but in the journey's events.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export interface JourneyResult {
  /** The journey's ID. */
  readonly journeyId: JourneyId;
  /** How the journey ended. */
  readonly status: JourneyStatus;
  /** Why the journey failed, when it failed. */
  readonly failure: Failure | undefined;
  /** Why the journey was aborted, when it was. */
  readonly abort: Abort | undefined;
  /**
   * Reads the journey's output from its data bag: under each key of `shape`,
   * the value its type reads, as {@link DataBag.read} reads it, so an `Option`
   * for a type wrapped in `optional`, and an instance made by `fromValue` for
   * a class named with `classOf`.
   *
   * {@includeCode ../../examples/output.ts}
   *
   * @throws OutputError when the journey was aborted, since it has no data
   * bag, or on the first key of `shape` that holds no value, or a value its
   * type refuses.
   */
  output<S extends OutputShape>(shape: S): Output<S>;
  /** Whether the journey succeeded. */
  isSucceeded(): this is {
    /** How the journey ended: it succeeded. */
    readonly status: Succeeded;
  };
  /** Whether the journey failed. */
  isFailed(): this is {
    /** How the journey ended: it failed. */
    readonly status: Failed;
  };
  /** Whether the journey was aborted. */
  isAborted(): this is {
    /** How the journey ended: it was aborted. */
    readonly status: Aborted;
  };
}

/** The result of the journey `journeyId`, which ended as `status` says. */
export function resultOf(
  journeyId: JourneyId,
  status: JourneyStatus,
): JourneyResult {
  return Object.freeze(new Ended(journeyId, Object.freeze(status)));
}

class Ended implements JourneyResult {
  constructor(
    readonly journeyId: JourneyId,
    readonly status: JourneyStatus,
  ) {}

  get failure(): Failure | undefined {
    return this.status.kind === "failed" ? this.status.failure : undefined;
  }

  get abort(): Abort | undefined {
    return this.status.kind === "aborted" ? this.status.abort : undefined;
  }

  output<S extends OutputShape>(shape: S): Output<S> {
    if (this.status.kind === "aborted") {
      throw new OutputError({ kind: "aborted" });
    }
    return outputOf(this.status.dataBag, shape);
  }

  isSucceeded(): this is {
    /** How the journey ended: it succeeded. */
    readonly status: Succeeded;
  } {
    return this.status.kind === "succeeded";
  }

  isFailed(): this is {
    /** How the journey ended: it failed. */
    readonly status: Failed;
  } {
    return this.status.kind === "failed";
  }

  isAborted(): this is {
    /** How the journey ended: it was aborted. */
    readonly status: Aborted;
  } {
    return this.status.kind === "aborted";
  }
}
