import { defineParameterType } from "@cucumber/cucumber";
import { valueType, valueTypes } from "../model.js";

/** One or more names, each in double quotes, separated by commas: `"a", "b"`. */
defineParameterType({
  name: "names",
  regexp: /"[^"]*"(?:, "[^"]*")*/,
  transformer: names,
});

/** A type of the neutral vocabulary. */
defineParameterType({
  name: "type",
  regexp: new RegExp(valueTypes.join("|")),
  transformer: valueType,
});

function names(text: string): string[] {
  return text.split(", ").map(unquoted);
}

function unquoted(name: string): string {
  return name.slice(1, -1);
}
