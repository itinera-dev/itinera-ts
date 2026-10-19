import { describe, expect, it } from "vitest";
import { provider, step } from "../fixtures.js";
import { providerViolations } from "./providers.js";

const steps = [step("charge", { rescue: [] }), step("ship")];

describe("providerViolations", () => {
  it("names a name two providers have", () => {
    expect(
      providerViolations(steps, [
        provider("payments", { steps: ["charge"] }),
        provider("payments", { steps: ["ship"] }),
      ]),
    ).toEqual([{ kind: "duplicate provider name", provider: "payments" }]);
  });

  it.each([
    ["a step the workflow does not have", "pack"],
    ["the rescue step of a step without one", "ship_rescue"],
  ])("names a provider attached to %s", (_, name) => {
    expect(
      providerViolations(steps, [provider("payments", { steps: [name] })]),
    ).toEqual([
      {
        kind: "service provider for unknown step",
        provider: "payments",
        step: name,
      },
    ]);
  });

  it("names two providers of one key attached to no step, whether a step requests it or not", () => {
    expect(
      providerViolations(steps, [provider("payments"), provider("backup")]),
    ).toEqual([
      {
        kind: "service provided twice",
        key: "payments",
        providers: ["payments", "backup"],
      },
    ]);
  });

  it("names two providers of one key attached to one step", () => {
    expect(
      providerViolations(steps, [
        provider("payments", { steps: ["charge_rescue"] }),
        provider("backup", { steps: ["ship", "charge_rescue"] }),
        provider("stock", { serviceKey: "stock", steps: ["charge_rescue"] }),
      ]),
    ).toEqual([
      {
        kind: "service provided twice",
        key: "payments",
        step: "charge_rescue",
        providers: ["payments", "backup"],
      },
    ]);
  });
});
