/** What the scenario gives, as the language gives it to itinera. */
import type { PlainValue } from "itinera/value";
import { ThrowingRecord } from "./converted.js";
import type { Scripted } from "./model/value.js";

/**
 * What the scenario gives: a value, something that is not one, or a new
 * object of `throwing record`, the last two typed as a plain value as only a
 * cast lets them be.
 */
export function given(scripted: Scripted): PlainValue {
  switch (scripted.kind) {
    case "value":
      return scripted.value;
    case "non-value":
      return notAValue();
    case "throwing record":
      return new ThrowingRecord() as unknown as PlainValue;
  }
}

/**
 * What the scenario gives, as {@link given} gives it, but as a new copy of
 * the value each time, for a step that changes it in place.
 */
export function fresh(scripted: Scripted): PlainValue {
  return scripted.kind === "value"
    ? structuredClone(scripted.value)
    : given(scripted);
}

/** Something that is not a value: a function, which only a cast lets through. */
function notAValue(): PlainValue {
  return notAValue as unknown as PlainValue;
}
