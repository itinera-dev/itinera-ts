import { describe, expect, it } from "vitest";
import { ModelError } from "../../../../src/model/error.js";
import { Providers } from "../../../../src/model/provider/providers.js";

/** The providers `stock`, of journey scope, then `fresh`, of attempt scope, both for `stock`. */
function stockAndFresh(): Providers {
  const providers = new Providers();
  providers.declare("stock", { key: "stock", type: "labeller" }, "journey");
  providers.declare("fresh", { key: "stock", type: "labeller" }, "attempt");
  return providers;
}

describe("Providers", () => {
  it("declares a provider making first labellers, failing never and attached to no step", () => {
    expect(stockAndFresh().provider("fresh")).toEqual({
      name: "fresh",
      service: { key: "stock", type: "labeller" },
      scope: "attempt",
      requests: [],
      actions: [],
      implementation: "first labeller",
      asynchronous: false,
    });
  });

  it("finds the provider declared first under a name two share", () => {
    const providers = stockAndFresh();
    providers.declare("stock", { key: "payments", type: "meter" }, "journey");
    expect(providers.provider("stock").service.key).toBe("stock");
  });

  it("refuses a provider it never declared", () => {
    expect(() => stockAndFresh().provider("bank")).toThrow(ModelError);
  });

  it("attaches a provider to the steps given", () => {
    const providers = stockAndFresh();
    providers.attach("fresh", ["charge", "ship"]);
    expect(providers.provider("fresh").steps).toEqual(["charge", "ship"]);
  });

  it("refuses to attach a provider to no step", () => {
    expect(() => {
      stockAndFresh().attach("fresh", []);
    }).toThrow(ModelError);
  });

  it("refuses to say twice how a provider fails", () => {
    const providers = stockAndFresh();
    providers.fails("stock", { message: "down" });
    expect(() => {
      providers.fails("stock", { message: "again" });
    }).toThrow(ModelError);
  });
});

describe("Providers defined before the workflow", () => {
  it.each([
    ["attached to no step", [], undefined],
    ["attached to the steps given", ["charge", "ship"], ["charge", "ship"]],
  ])("binds a defined provider %s", (_, steps, attached) => {
    const providers = new Providers();
    providers.define("stock", { key: "stock", type: "labeller" }, "journey");
    providers.bind("stock", steps);
    providers.refuseUnbound();
    expect(providers.scripts).toHaveLength(1);
    expect(providers.provider("stock").steps).toEqual(attached);
  });

  it("declares defined providers in the order the workflow binds them", () => {
    const providers = new Providers();
    providers.define("stock", { key: "stock", type: "labeller" }, "journey");
    providers.define("fresh", { key: "stock", type: "labeller" }, "attempt");
    providers.bind("fresh");
    providers.bind("stock");
    expect(providers.scripts.map((script) => script.name)).toEqual([
      "fresh",
      "stock",
    ]);
  });

  it("refuses to bind a provider declared in the workflow already", () => {
    expect(() => {
      stockAndFresh().bind("stock");
    }).toThrow(
      new ModelError(
        'no service provider "stock" is defined and waiting to be bound',
      ),
    );
  });

  it("refuses a provider defined and never bound", () => {
    const providers = new Providers();
    providers.define("stock", { key: "stock", type: "labeller" }, "journey");
    expect(() => {
      providers.refuseUnbound();
    }).toThrow(
      new ModelError(
        'the service provider "stock" is defined but the workflow never binds it',
      ),
    );
  });
});
