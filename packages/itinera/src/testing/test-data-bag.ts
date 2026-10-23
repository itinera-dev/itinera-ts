import { type DataBag, dataBagOf } from "../journey/data-bag.js";
import type { AsValue, PlainValue } from "../value.js";
import { captured } from "./captured.js";

/**
 * A data bag built from values, outside any journey, so that a test calls an
 * input adapter itself and lends it read access to the data bag, as a
 * journey does. It is named apart from the journey's own `DataBag`, which
 * only itinera makes.
 *
 * {@includeCode ../../examples/test-data-bag.ts}
 */
export class TestDataBag {
  #values: ReadonlyMap<string, PlainValue> = new Map();

  /**
   * A data bag holding what this one holds, and `value` under `key`,
   * captured as it is now.
   *
   * @throws TypeError when `value` is not a value.
   */
  with<T>(key: string, value: T & AsValue<T>): TestDataBag {
    const bag = new TestDataBag();
    bag.#values = new Map(this.#values).set(
      key,
      captured(value, `the value given under ${key}`),
    );
    return bag;
  }

  /** Read access to the data bag, as an input adapter requests it. */
  get access(): DataBag {
    return dataBagOf(this.#values);
  }
}
