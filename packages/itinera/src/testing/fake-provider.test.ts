import { describe, expect, it } from "vitest";
import {
  charge,
  chargingTill,
  counted,
  type Gateway,
  GATEWAY,
  orders,
  run,
  type Till,
} from "../engine/fixtures.js";
import type { Provided } from "../service.js";
import { serviceType } from "../service/request.js";
import type { Built } from "../workflow.js";
import { fakeProvider, type Provide } from "./fake-provider.js";
import { MistakeKind, TestMistake } from "./mistake.js";

/** The workflow `orders` of a till whose provider `main` counts its calls. */
function countingTill(): Built<Till> {
  return chargingTill(counted);
}

/** A fake making a gateway labelled `fake`. */
function fake(provide: Provide<Gateway>): Provided<Gateway> {
  return provide({ label: "fake" });
}

describe("fakeProvider", () => {
  it("returns the instance, whose journey calls the fake in place of the provider", async () => {
    const till = countingTill();
    const instance = till.instance();
    const faked = fakeProvider(instance, "main", GATEWAY, fake);
    const result = await run(faked);
    expect([faked, result.isSucceeded(), till.calls]).toEqual([
      instance,
      true,
      [],
    ]);
  });

  it("replaces the provider for that instance alone", async () => {
    const till = countingTill();
    fakeProvider(till.instance(), "main", GATEWAY, fake);
    await run(till.instance());
    expect(till.calls).toHaveLength(2);
  });

  it("replaces a fake given before for the same provider", async () => {
    const labels: string[] = [];
    const instance = countingTill().instance();
    fakeProvider(instance, "main", GATEWAY, (provide) => {
      labels.push("first");
      return provide({ label: "first" });
    });
    fakeProvider(instance, "main", GATEWAY, (provide) => {
      labels.push("second");
      return provide({ label: "second" });
    });
    await run(instance);
    expect(labels).toEqual(["second", "second"]);
  });

  it("throws a test mistake for a provider the workflow does not have", () => {
    expect(() =>
      fakeProvider(orders(charge()).instance(), "main", GATEWAY, fake),
    ).toThrow(
      new TestMistake([
        { kind: MistakeKind.UnknownProvider, provider: "main" },
      ]),
    );
  });

  it("throws a test mistake for a fake of another service than the provider makes", () => {
    const another = serviceType<{ readonly label: string }>("Till");
    expect(() =>
      fakeProvider(countingTill().instance(), "main", another, fake),
    ).toThrow(
      new TestMistake([{ kind: MistakeKind.AnotherService, provider: "main" }]),
    );
  });
});
