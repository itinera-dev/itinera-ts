/** What the scenario gives, as the language gives it to itinera. */
import type { PlainValue } from "itinera/value";
import type { Scripted } from "./model/value.js";

/**
 * What the scenario gives, as a value or as something that is not one,
 * typed as a value as only a cast lets it be.
 */
export function given(scripted: Scripted): PlainValue {
  return scripted.kind === "value" ? scripted.value : notAValue();
}

/**
 * What the scenario gives, as {@link given} gives it, but as a new copy of
 * the value each time, for a step that changes it in place.
 */
export function fresh(scripted: Scripted): PlainValue {
  return scripted.kind === "value"
    ? structuredClone(scripted.value)
    : notAValue();
}

/** Something that is not a value: a function, which only a cast lets through. */
function notAValue(): PlainValue {
  return notAValue as unknown as PlainValue;
}
