import { describe, expect, it } from "vitest";
import { provider } from "../fixtures.js";
import { attemptRequestsInJourneyScope } from "./scope.js";

describe("attemptRequestsInJourneyScope", () => {
  it.each([
    ["the attempt", "attempt"],
    ["the step's name", "stepName"],
  ] as const)("names a provider of journey scope requesting %s", (_, kind) => {
    expect(
      attemptRequestsInJourneyScope([
        provider("payments", { scope: "journey", requests: [{ kind }] }),
      ]),
    ).toEqual([
      { kind: "attempt request in journey scope", provider: "payments" },
    ]);
  });

  it("lets a provider of attempt scope request the attempt", () => {
    expect(
      attemptRequestsInJourneyScope([
        provider("payments", { requests: [{ kind: "attempt" }] }),
      ]),
    ).toEqual([]);
  });
});
