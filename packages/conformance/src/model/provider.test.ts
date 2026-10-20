import { describe, expect, it } from "vitest";
import { ModelError } from "./error.js";
import {
  implementationNamed,
  Providers,
  serviceTypeNamed,
} from "./provider.js";

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

describe("the names of the cases", () => {
  it.each([
    ["a service type", serviceTypeNamed, "printer"],
    ["an implementation of labeller", implementationNamed, "third labeller"],
  ])("refuses %s the cases never name", (_, named, name) => {
    expect(() => named(name)).toThrow(ModelError);
  });
});
