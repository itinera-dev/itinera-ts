import { describe, expect, it } from "vitest";
import { journeyId } from "../../journey/request.js";
import { None } from "../../option.js";
import { attempt, stepName } from "../../step/request.js";
import { optional, string } from "../../value/token.js";
import { fromWorkflow } from "../../workflow/request.js";
import { chargingTill, counted, run, travelled } from "../fixtures.js";

describe("answer", () => {
  it("answers each request of the provider, in the order it declares them", async () => {
    const till = chargingTill(counted, [
      journeyId(),
      stepName(),
      attempt(),
      fromWorkflow("gateway", string),
    ]);
    const instance = till.instance({ gateway: "main" });
    await run(instance);
    expect(till.calls).toMatchObject([
      ["main", instance.journeyId, "charge", { number: 1 }, "main"],
      ["main", instance.journeyId, "charge", { number: 2 }, "main"],
    ]);
  });

  it("answers an optional request with no value with None, reporting optional_input_absent naming the provider", async () => {
    const till = chargingTill(counted, [
      fromWorkflow("gateway", optional(string)),
    ]);
    const events = await travelled(till);
    expect(till.calls[0]).toEqual(["main", None]);
    expect(events[2]).toMatchObject({
      kind: "optional_input_absent",
      key: "gateway",
      requester: {
        kind: "provider",
        provider: "main",
        step: "charge",
        attempt: { number: 1 },
      },
    });
  });
});
