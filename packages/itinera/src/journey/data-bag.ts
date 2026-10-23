import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Option } from "../option.js";
import type { PlainValue } from "../value.js";
import { type Optional, type RequestType, unwrapped } from "../value/token.js";
import { type Read, readOf } from "./read.js";

let made: (values: ReadonlyMap<string, PlainValue>) => DataBag;
let emptied: (bag: DataBag) => void;

/**
 * The data of one journey: values by key, in the order each key was first
 * set. It starts as the instance's initial data, and a journey that succeeds
 * or fails hands it over in its result, as the journey's output. An input
 * adapter that requests it reads it while the step is built. Only itinera
 * makes one, and it has no method that writes.
 *
 * {@includeCode ../../examples/data-bag.ts}
 */
export class DataBag {
  static {
    made = (values) => new DataBag(values);
    emptied = (bag) => {
      bag.#values = new Map();
    };
  }

  #values: ReadonlyMap<string, PlainValue>;

  private constructor(values: ReadonlyMap<string, PlainValue>) {
    this.#values = new Map(values);
  }

  /** Its keys, in the order each was first set. */
  keys(): readonly string[] {
    return [...this.#values.keys()];
  }

  /**
   * Reads the value under `key` as the type `type` checks, which may be one
   * of itinera's tokens or any other Standard Schema validator: present, as
   * the reader's own copy, or an instance made by `fromValue` for a class
   * named with `classOf`; absent; or of another type, when `type` refuses
   * the value, throws, or checks it asynchronously, or when a `fromValue`
   * throws. With a type wrapped in `optional`, the key is never absent: it
   * reads present, as `None` when it holds no value and as `Some` of a value
   * of the type.
   *
   * {@includeCode ../../examples/data-bag.ts}
   */
  read<S extends StandardSchemaV1>(
    key: string,
    type: S,
  ): Read<StandardSchemaV1.InferInput<S>>;
  read<S extends StandardSchemaV1>(
    key: string,
    type: Optional<S>,
  ): Read<Option<StandardSchemaV1.InferInput<S>>>;
  read(key: string, type: RequestType): Read<unknown>;
  read(key: string, type: RequestType): Read<unknown> {
    return readOf(this.#values.get(key), unwrapped(type));
  }
}

/** A data bag holding a copy of `values`, in their order. */
export function dataBagOf(values: ReadonlyMap<string, PlainValue>): DataBag {
  return made(values);
}

/**
 * A data bag holding a copy of `values`, given for one call, which shows
 * nothing once `close()` is called: no key, and every read absent.
 */
export function dataBagFor(values: ReadonlyMap<string, PlainValue>): {
  readonly dataBag: DataBag;
  close(): void;
} {
  const dataBag = made(values);
  return {
    dataBag,
    close: () => {
      emptied(dataBag);
    },
  };
}
