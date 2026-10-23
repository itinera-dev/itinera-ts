import { describe, expect, it } from "vitest";
import { Alone } from "../../src/alone.js";
import { Model, ModelError } from "../../src/model.js";
import { TestSupport } from "../../src/model/testing.js";
import { Witness } from "../../src/witness.js";

/** The step policy `audit`, defining only `on step success`, with its witness. */
function audit() {
  const model = new Model();
  model.policies.define("step", "audit", "on step success");
  return { model, witness: new Witness(model.policies.roles, model.providers) };
}

function alone(): Alone {
  return new Alone(new TestSupport());
}

describe("Alone", () => {
  it("refuses to read what an input adapter returned before one is called", () => {
    expect(() => alone().returned).toThrow(
      new ModelError("no input adapter was called alone"),
    );
  });

  it("refuses a hook its policy does not define", async () => {
    const { model, witness } = audit();
    await expect(
      alone().runHook(model, witness, "audit", "on step failure"),
    ).rejects.toThrow(
      new ModelError('the policy "audit" defines no hook "on step failure"'),
    );
  });

  it("refuses a sentence naming something other than what was called alone", async () => {
    const { model, witness } = audit();
    const called = alone();
    await called.runHook(model, witness, "audit", "on step success");
    expect(() => {
      called.ensureCalled('the hook "on step success" of policy "audit"');
    }).not.toThrow();
    expect(() => {
      called.ensureCalled('step "charge"');
    }).toThrow(new ModelError('step "charge" was not called alone'));
  });
});
