import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Contributor, Read } from "../journey.js";
import { dataBagOf } from "../journey/data-bag.js";
import type { Option } from "../option.js";
import type { HookReporter } from "../policy.js";
import type { StepReporter } from "../step.js";
import type { PlainValue } from "../value.js";
import type { Optional, RequestType } from "../value/token.js";
import type { Emitted } from "./emitted.js";
import { Lone } from "./lone.js";

/**
 * Lends a contributor outside any journey, so that a test calls a step's
 * `run` or a hook itself, and keeps what is contributed through it. The
 * contributor behaves as in a journey, but nothing is committed: committing
 * a successful attempt's contributions belongs to a journey.
 *
 * {@includeCode ../../examples/contributions.ts}
 */
export class Contributions {
  readonly #lone = new Lone("step", false);

  /** The contributor it lends. */
  get contributor(): Contributor {
    return this.#lone.handles.contributor;
  }

  /** The keys contributed under, in the order first contributed. */
  keys(): readonly string[] {
    return [...this.#lone.handles.contributed.keys()];
  }

  /**
   * Reads the last value contributed under `key` as the type `type` checks,
   * as the data bag's `read` does: present, absent or of another type.
   *
   * {@includeCode ../../examples/contributions.ts}
   */
  read<S extends StandardSchemaV1>(
    key: string,
    type: S,
  ): Read<StandardSchemaV1.InferInput<S>>;
  read<S extends StandardSchemaV1>(
    key: string,
    type: Optional<S>,
  ): Read<Option<StandardSchemaV1.InferInput<S>>>;
  read(key: string, type: RequestType): Read<unknown> {
    return dataBagOf(this.#lone.handles.contributed).read(key, type);
  }
}

/**
 * Lends a step's reporter outside any journey, so that a test calls a step's
 * `run` itself, and keeps every event emitted through it and the global
 * metadata set. The reporter behaves as in a journey: one made `failing`
 * interrupts every call and keeps nothing, and setting `journey_id`
 * interrupts that call and every later one. An interrupted call rejects.
 *
 * {@includeCode ../../examples/event-reporter-recorders.ts}
 */
export class StepEventReporter {
  readonly #lone: Lone;

  /** A recorder that keeps what it is given, or interrupts every call when `failing`. */
  constructor(failing = false) {
    this.#lone = new Lone("step", failing);
  }

  /** A recorder whose reporter interrupts every call and keeps nothing. */
  static failing(): StepEventReporter {
    return new StepEventReporter(true);
  }

  /** The step reporter it lends. */
  get reporter(): StepReporter {
    return this.#lone.handles.reporter;
  }

  /** Every event emitted, in order. */
  get emitted(): readonly Emitted[] {
    return this.#lone.emitted;
  }

  /** Each entry of global metadata set, with its latest value. */
  get globalMetadata(): ReadonlyMap<string, PlainValue> {
    return this.#lone.globalMetadata;
  }
}

/**
 * Lends a hook's reporter outside any journey, so that a test calls a hook
 * itself, and keeps every event emitted through it and the global metadata
 * set, as {@link StepEventReporter} does for a step's.
 *
 * {@includeCode ../../examples/event-reporter-recorders.ts}
 */
export class HookEventReporter {
  readonly #lone: Lone;

  /** A recorder that keeps what it is given, or interrupts every call when `failing`. */
  constructor(failing = false) {
    this.#lone = new Lone("hook", failing);
  }

  /** A recorder whose reporter interrupts every call and keeps nothing. */
  static failing(): HookEventReporter {
    return new HookEventReporter(true);
  }

  /** The hook reporter it lends. */
  get reporter(): HookReporter {
    return this.#lone.handles.reporter;
  }

  /** Every event emitted, in order. */
  get emitted(): readonly Emitted[] {
    return this.#lone.emitted;
  }

  /** Each entry of global metadata set, with its latest value. */
  get globalMetadata(): ReadonlyMap<string, PlainValue> {
    return this.#lone.globalMetadata;
  }
}
