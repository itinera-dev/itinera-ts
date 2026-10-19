import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..", "..");
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
const runner = join(__dirname, "..", "..", "dist", "main.js");
const reports = mkdtempSync(join(tmpdir(), "itinera-conformance-"));

interface Report {
  readonly elements: readonly {
    readonly name: string;
    readonly steps: readonly { readonly result: { readonly status: string } }[];
  }[];
}

/** Runs the runner on its own cases in this directory of `tests/fixtures/cases`. */
function run(cases: string, tags: string) {
  const report = join(reports, `${cases}.json`);
  const ran = spawnSync(process.execPath, [runner], {
    env: {
      ...process.env,
      ITINERA_CONFORMANCE_CASES: join(
        __dirname,
        "..",
        "fixtures",
        "cases",
        cases,
      ),
      ITINERA_CONFORMANCE_TAGS: tags,
      ITINERA_CONFORMANCE_REPORT: report,
    },
    encoding: "utf8",
  });
  return {
    succeeded: ran.status === 0,
    output: `${ran.stdout}${ran.stderr}`,
    report: () => JSON.parse(readFileSync(report, "utf8")) as Report[],
  };
}

function scenarios(features: Report[]): string[] {
  return features
    .flatMap((feature) => feature.elements)
    .map((scenario) => scenario.name);
}

function statuses(features: Report[]): string[] {
  return features
    .flatMap((feature) => feature.elements)
    .flatMap((scenario) => scenario.steps)
    .map((step) => step.result)
    .map((result) => result.status);
}

describe("the conformance runner", () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      tsc,
      "-p",
      join(root, "packages", "itinera", "tsconfig.build.json"),
    ]);
    execFileSync(process.execPath, [
      tsc,
      "-p",
      join(__dirname, "..", "..", "tsconfig.build.json"),
    ]);
  }, 120_000);

  it("passes scenarios whose every sentence it defines, and reports them as Cucumber JSON", () => {
    const ran = run("given", "@proposal-0002");
    expect(ran.succeeded, ran.output).toBe(true);
    expect(scenarios(ran.report())).toEqual([
      "The sentences about a workflow's steps fill the scenario model",
      "The sentences about data, journey IDs and reporters fill the scenario model",
      "The sentences about initial data fill the scenario model",
      "The sentences about dispatchers fill the scenario model",
      "The sentences about dispatchers fill the scenario model",
      "The sentences about dispatchers fill the scenario model",
      "The sentences about dispatchers fill the scenario model",
    ]);
    expect(new Set(statuses(ran.report()))).toEqual(new Set(["passed"]));
  });

  it("runs journeys and passes scenarios whose expectations itinera meets", () => {
    const ran = run("journeys", "@proposal-0009");
    expect(ran.succeeded, ran.output).toBe(true);
    expect(new Set(statuses(ran.report()))).toEqual(new Set(["passed"]));
  });

  it("fails a scenario whose expectation itinera does not meet, saying what it expected", () => {
    const ran = run("unmet", "@tier-1");
    expect(ran.succeeded).toBe(false);
    expect(statuses(ran.report())).toEqual(["passed", "passed", "failed"]);
    expect(ran.output).toContain(
      "expected the journey failed; found it succeeded",
    );
  });

  it("runs only the scenarios the tag expression selects, and reports only those", () => {
    const ran = run(
      "selection",
      "(@proposal-0002 or @proposal-0008) and not @non-value",
    );
    expect(ran.succeeded, ran.output).toBe(true);
    expect(scenarios(ran.report())).toEqual([
      "A selected scenario",
      "A scenario of another proposal",
    ]);
  });

  it("fails a scenario that uses a sentence it does not define", () => {
    const ran = run("undefined", "@tier-1");
    expect(ran.succeeded).toBe(false);
    expect(statuses(ran.report())).toEqual(["passed", "undefined"]);
  });

  it("fails a scenario whose sentences do not fit together, as an error in the case", () => {
    const ran = run("in-error", "@tier-1");
    expect(ran.succeeded).toBe(false);
    expect(ran.output).toContain("no workflow is declared yet");
  });

  it("refuses to run without saying what to run", () => {
    const ran = run("given", "");
    expect(ran.succeeded).toBe(false);
    expect(ran.output).toContain("ITINERA_CONFORMANCE_TAGS is not set");
  });
});
