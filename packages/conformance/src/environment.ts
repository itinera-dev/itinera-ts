import { parse } from "@cucumber/tag-expressions";

/** The variable naming the directory of the feature files. */
export const CASES = "ITINERA_CONFORMANCE_CASES";
/** The variable holding the tag expression that selects the scenarios. */
export const TAGS = "ITINERA_CONFORMANCE_TAGS";
/** The variable naming the file the Cucumber JSON report is written to. */
export const REPORT = "ITINERA_CONFORMANCE_REPORT";

/** What one run of the runner reads from its environment. */
export interface Environment {
  /** The directory holding the feature files, searched recursively. */
  readonly cases: string;
  /**
   * Selects the scenarios that run, from the tags of each scenario, its rule
   * and its feature.
   */
  readonly tags: string;
  /** The file the Cucumber JSON report is written to, replacing what it held. */
  readonly report: string;
}

/** Why the environment does not say what to run. */
export class EnvironmentError extends Error {
  override readonly name = "EnvironmentError";
}

/**
 * Reads what to run and where to report from these variables, refusing a
 * missing or empty one and a tag expression that does not parse.
 */
export function readEnvironment(
  variables: Readonly<Record<string, string | undefined>>,
): Environment {
  const tags = required(variables, TAGS);
  try {
    parse(tags);
  } catch {
    throw new EnvironmentError(`${TAGS} is not a tag expression: ${tags}`);
  }
  return {
    cases: required(variables, CASES),
    tags,
    report: required(variables, REPORT),
  };
}

/** The value of a variable that must be set; an empty one counts as missing. */
function required(
  variables: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = variables[name];
  if (value === undefined || value === "") {
    throw new EnvironmentError(`${name} is not set`);
  }
  return value;
}
