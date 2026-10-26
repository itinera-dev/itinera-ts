import { defineParameterType } from "@cucumber/cucumber";
import { valueType, valueTypes } from "../model.js";
import {
  implementationNamed,
  implementations,
  serviceTypeNamed,
  serviceTypes,
} from "../model/provider.js";
import { statuses, stepStatus } from "../trace/status.js";

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

/** A service type the cases name. */
defineParameterType({
  name: "serviceType",
  regexp: new RegExp(serviceTypes.join("|")),
  transformer: serviceTypeNamed,
});

/** An implementation of `labeller` the cases name. */
defineParameterType({
  name: "implementation",
  regexp: new RegExp(implementations.join("|")),
  transformer: implementationNamed,
});

/** A step's status at the end of a journey, as the cases name it. */
defineParameterType({
  name: "status",
  regexp: new RegExp(statuses.join("|")),
  transformer: stepStatus,
});

function names(text: string): string[] {
  return text.split(", ").map(unquoted);
}

function unquoted(name: string): string {
  return name.slice(1, -1);
}
