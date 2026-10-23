/**
 * Runs the Itinera conformance cases against itinera: the scenarios the
 * environment selects, writing the Cucumber JSON report.
 */
import { join } from "node:path";
import { loadConfiguration, runCucumber } from "@cucumber/cucumber/api";
import { readEnvironment, type Environment } from "./environment.js";

/**
 * Runs the selected scenarios and writes the report, telling whether every
 * one passed. A sentence the runner does not define fails its scenario.
 */
async function run({ cases, tags, report }: Environment): Promise<boolean> {
  const { runConfiguration } = await loadConfiguration({
    file: false,
    provided: {
      paths: [cases],
      require: [join(__dirname, "support.js")],
      tags,
      format: ["summary", ["json", report]],
      strict: true,
    },
  });
  const { success } = await runCucumber(runConfiguration);
  return success;
}

async function main(): Promise<boolean> {
  return run(readEnvironment(process.env));
}

main().then(
  (success) => {
    process.exitCode = success ? 0 : 1;
  },
  (error: unknown) => {
    console.error(String(error));
    process.exitCode = 1;
  },
);
