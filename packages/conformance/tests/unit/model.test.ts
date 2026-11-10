import { describe, expect, it } from "vitest";
import { Model, ModelError, scripted, succeeds } from "../../src/model.js";

function orders(...steps: string[]): Model {
  const model = new Model();
  model.declare("orders", steps);
  return model;
}

describe("the scenario model", () => {
  it("declares one workflow only", () => {
    expect(() => {
      orders("charge").declare("shipping", ["ship"]);
    }).toThrow(new ModelError("a workflow is already declared"));
  });

  it("has no workflow until a sentence declares it", () => {
    expect(() => new Model().workflow).toThrow(
      new ModelError("no workflow is declared yet"),
    );
  });

  it("scripts a step once, whatever times its name is declared", () => {
    const model = orders("charge", "charge");
    expect(model.workflow.steps).toEqual(["charge", "charge"]);
    expect([...model.workflow.scripts.keys()]).toEqual(["charge"]);
  });

  it("refuses to script a step the workflow does not have", () => {
    expect(() => orders("charge").step("ship")).toThrow(
      new ModelError('the workflow has no step "ship"'),
    );
  });

  it("scripts a rescue step under its own name", () => {
    const model = orders("charge");
    model.rescue("charge");
    expect(model.step("charge").hasRescueStep).toBe(true);
    expect(model.rescueStep("charge_rescue").isRescueStep).toBe(true);
  });

  it("shares one script between a rescue step and a step declared with its name", () => {
    const model = orders("charge", "charge_rescue");
    model.step("charge_rescue").retries = 2;
    model.rescue("charge");
    expect(model.rescueStep("charge_rescue").retries).toBe(2);
    expect([...model.workflow.scripts.keys()]).toEqual([
      "charge",
      "charge_rescue",
    ]);
  });

  it("refuses a rescue step's request for a step that is not one", () => {
    expect(() => orders("charge").rescueStep("charge")).toThrow(
      new ModelError('"charge" is not a rescue step'),
    );
  });

  it("says how a step's attempts end once", () => {
    const model = orders("charge");
    model.ends("charge", [succeeds]);
    expect(() => {
      model.ends("charge", [succeeds]);
    }).toThrow(
      new ModelError('how the attempts of "charge" end is already stated'),
    );
  });

  it("refuses an empty data bag once it holds initial data", () => {
    const model = orders("charge");
    model.initialData.push(["amount", scripted("10")]);
    expect(() => {
      model.emptyDataBag();
    }).toThrow(new ModelError("the data bag already holds initial data"));
  });

  it("lists the workflow's reporters once", () => {
    const model = orders("charge");
    model.listReporters(["audit"]);
    expect(() => {
      model.listReporters(["metrics"]);
    }).toThrow(new ModelError("the workflow's reporters are already listed"));
  });

  it("says where the journey ID comes from once", () => {
    const model = orders("charge");
    model.generateIdsWith({ kind: "default" });
    expect(() => {
      model.generateIdsWith({ kind: "returns", id: "journey-7" });
    }).toThrow(new ModelError("the workflow's ID generator is already stated"));
  });

  it("says how a reporter fails once", () => {
    const model = orders("charge");
    model.fails("audit", { kind: "first event" });
    expect(() => {
      model.fails("audit", { kind: "on global metadata", key: "tenant" });
    }).toThrow(
      new ModelError('how the reporter "audit" fails is already stated'),
    );
  });

  it("says what the executor dispatches with once", () => {
    const model = orders("charge");
    model.dispatchWith({ kind: "default" });
    expect(() => {
      model.dispatchWith({ kind: "failing factory" });
    }).toThrow(
      new ModelError("what the executor dispatches with is already stated"),
    );
  });
});
