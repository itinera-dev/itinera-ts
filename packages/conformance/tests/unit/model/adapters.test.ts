import { describe, expect, it } from "vitest";
import {
  type AdapterDefinition,
  unscriptedAdapter,
} from "../../../src/model/adapter.js";
import { InputAdapters } from "../../../src/model/adapters.js";
import { ModelError } from "../../../src/model/error.js";

function nameOf(adapter: AdapterDefinition): string {
  return adapter.name;
}

describe("InputAdapters", () => {
  it("declares input adapters in order, each found by its name", () => {
    const adapters = new InputAdapters();
    adapters.declare("pricing", ["charge"]);
    adapters.declare("discounts", ["charge"]);
    expect(adapters.scripts.map(nameOf)).toEqual(["pricing", "discounts"]);
    expect(adapters.adapter("discounts")).toBe(adapters.scripts[1]);
  });

  it("refuses an input adapter attached to no step", () => {
    expect(() => {
      new InputAdapters().declare("pricing", []);
    }).toThrow(
      new ModelError('the input adapter "pricing" is attached to no step'),
    );
  });

  it("binds an adapter defined before the workflow, keeping what it was scripted to do", () => {
    const adapters = new InputAdapters();
    adapters.adapter("pricing").requests.push({ kind: "data bag" });
    adapters.bind("pricing", ["charge", "ship"]);
    expect(adapters.scripts).toEqual([
      {
        name: "pricing",
        steps: ["charge", "ship"],
        requests: [{ kind: "data bag" }],
        answers: [],
        writes: [],
      },
    ]);
  });

  it("declares an adapter no sentence defined when the workflow binds it", () => {
    const adapters = new InputAdapters();
    adapters.bind("pricing", ["charge"]);
    expect(adapters.scripts).toEqual([
      unscriptedAdapter("pricing", ["charge"]),
    ]);
  });

  it("refuses to find as declared an adapter only defined", () => {
    const adapters = new InputAdapters();
    adapters.adapter("pricing");
    expect(() => adapters.declared("pricing")).toThrow(
      new ModelError('the workflow declares no input adapter "pricing"'),
    );
  });

  it("refuses an adapter defined and never bound", () => {
    const adapters = new InputAdapters();
    adapters.adapter("pricing");
    expect(() => {
      adapters.refuseUnbound();
    }).toThrow(
      new ModelError(
        'the input adapter "pricing" is defined but the workflow never binds it',
      ),
    );
  });

  it("refuses no adapter once every one defined is bound", () => {
    expect(() => {
      boundPricing().refuseUnbound();
    }).not.toThrow();
  });
});

function boundPricing(): InputAdapters {
  const adapters = new InputAdapters();
  adapters.adapter("pricing");
  adapters.bind("pricing", ["charge"]);
  return adapters;
}
