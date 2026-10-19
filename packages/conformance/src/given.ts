/** What the scenario gives, as the language gives it to itinera. */
import type { Value } from "itinera/unstable";
import type { Scripted } from "./model/value.js";

/** What the scenario gives, as a value or as something that is not one. */
export function given(scripted: Scripted): Value {
  return scripted.kind === "value" ? scripted.value : notAValue();
}

/** Something that is not a value: a function, which only a cast lets through. */
function notAValue(): Value {
  return notAValue as unknown as Value;
}
