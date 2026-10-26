import { MistakeKind, TestMistake } from "itinera/testing";
import { describe, expect, it } from "vitest";
import { admitted } from "../../src/journeys.js";
import { Model, ModelError } from "../../src/model.js";
import type { ScriptRow } from "../../src/model/testing.js";
import { Recorders } from "../../src/recorders.js";
import { instanceOf } from "../../src/scenario.js";
import { runScript } from "../../src/script.js";
import { Witness } from "../../src/witness.js";

/** A new instance of the workflow `orders`, whose steps `charge` and `ship` succeed. */
function shop() {
  const model = new Model();
  model.declare("orders", ["charge", "ship"]);
  const admission = admitted(
    model,
    new Witness(model.policies.roles, model.providers),
  );
  if (admission.kind === "refused") {
    throw admission.violations;
  }
  return instanceOf(
    admission.workflow,
    model,
    new Recorders(model.reporterFailures),
  );
}

/** A row of the script ending as `ending` says, doing nothing before. */
function row(
  step: string,
  ending: ScriptRow["ending"],
  attempt: ScriptRow["attempt"] = 1,
): ScriptRow {
  return { step, attempt, contributes: [], setsGlobalMetadata: [], ending };
}

describe("runScript", () => {
  it("writes each row under the step it names, and runs the script", async () => {
    const run = await runScript(
      shop(),
      [
        row("charge", { kind: "success" }),
        row("ship", { kind: "skipped", code: "collected" }),
      ],
      true,
    );
    expect(run.result.isSucceeded()).toBe(true);
    expect(run.step("ship").attempts).toHaveLength(1);
  });

  it("names a step again when another step's rows come between its rows", () => {
    expect(() =>
      runScript(
        shop(),
        [
          row("charge", { kind: "success" }),
          row("ship", { kind: "success" }),
          row("charge", { kind: "success" }, "remaining"),
        ],
        false,
      ),
    ).toThrow(
      new TestMistake([
        { kind: MistakeKind.StepScriptedTwice, step: "charge" },
      ]),
    );
  });

  it("refuses a row that runs the real step and does more", () => {
    expect(() =>
      runScript(
        shop(),
        [
          {
            ...row("charge", { kind: "real run" }),
            contributes: [["due", 40]],
          },
        ],
        false,
      ),
    ).toThrow(ModelError);
  });
});
