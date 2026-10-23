/** The sentences of the recorders, which lend a step, a hook or an input adapter its handles outside a journey. */
import { isDeepStrictEqual } from "node:util";
import { type DataTable, Given, Then, When } from "@cucumber/cucumber";
import { json, rows } from "../model.js";
import { Unmet, holds } from "../unmet.js";
import type { World } from "../world.js";
import { entryOf } from "./alone/kept.js";

When<World>("step {string} runs alone", async function (step: string) {
  await this.callAlone((alone) =>
    alone.runStep(this.model, this.witness, step),
  );
});

When<World>(
  "the hook {string} of policy {string} runs alone",
  async function (hook: string, policy: string) {
    await this.callAlone((alone) =>
      alone.runHook(this.model, this.witness, policy, hook),
    );
  },
);

When<World>(
  "the input adapter {string} is called alone for the input {string} of step {string}, with a data bag holding:",
  async function (
    adapter: string,
    key: string,
    step: string,
    table: DataTable,
  ) {
    const workflow = admittedWorkflow(this);
    const values = rows(table).map(entryOf);
    await this.callAlone((alone) => {
      alone.callAdapter(this.model, workflow, { adapter, step, key }, values);
    });
  },
);

Given<World>("the step event reporter is failing", function () {
  this.model.testing.failStepRecorder();
});

Given<World>("the hook event reporter is failing", function () {
  this.model.testing.failHookRecorder();
});

Then<World>("the input adapter returned {}", function (value: string) {
  const returned = this.alone.returned;
  const expected = json(value);
  holds(
    returned.kind === "supplied" && isDeepStrictEqual(returned.value, expected),
    `the input adapter to return ${value}`,
    JSON.stringify(returned),
  );
});

function admittedWorkflow(world: World) {
  const admission = world.admit();
  if (admission.kind === "refused") {
    throw new Unmet(
      `expected the workflow to be admitted; it was refused: ${admission.violations.message}`,
    );
  }
  return admission.workflow;
}
