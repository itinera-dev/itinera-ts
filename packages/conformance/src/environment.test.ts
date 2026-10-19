import { describe, expect, it } from "vitest";
import {
  CASES,
  EnvironmentError,
  readEnvironment,
  REPORT,
  TAGS,
} from "./environment.js";

describe("the environment", () => {
  it("says what to run and where to report in three variables", () => {
    expect(
      readEnvironment({
        [CASES]: "cases",
        [TAGS]: "@tier-1",
        [REPORT]: "out/cucumber.json",
      }),
    ).toEqual({ cases: "cases", tags: "@tier-1", report: "out/cucumber.json" });
  });

  it.each([
    ["the cases", { [TAGS]: "@a", [REPORT]: "r" }, CASES],
    ["the tags", { [CASES]: "c", [REPORT]: "r" }, TAGS],
    ["the report", { [CASES]: "c", [TAGS]: "@a" }, REPORT],
    ["an empty variable", { [CASES]: "c", [TAGS]: "", [REPORT]: "r" }, TAGS],
  ])(
    "requires every variable, refusing one without %s",
    (_, variables, missing) => {
      expect(() => readEnvironment(variables)).toThrow(
        new EnvironmentError(`${missing} is not set`),
      );
    },
  );

  it("counts an empty variable as missing", () => {
    expect(() =>
      readEnvironment({ [CASES]: "c", [TAGS]: "", [REPORT]: "r" }),
    ).toThrow(new EnvironmentError(`${TAGS} is not set`));
  });

  it("refuses a tag expression that does not parse", () => {
    expect(() =>
      readEnvironment({ [CASES]: "c", [TAGS]: "(@a and", [REPORT]: "r" }),
    ).toThrow(new EnvironmentError(`${TAGS} is not a tag expression: (@a and`));
  });
});
