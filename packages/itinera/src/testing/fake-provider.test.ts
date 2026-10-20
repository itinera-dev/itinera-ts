import { describe, expect, it } from "vitest";
import {
  charge,
  chargingTill,
  counted,
  GATEWAY,
  orders,
  run,
} from "../engine/fixtures.js";
import { serviceType } from "../service/request.js";
import { fakeProvider } from "./fake-provider.js";
import { MistakeKind, TestMistake } from "./mistake.js";

describe("fakeProvider", () => {
  it("returns the instance, whose journey calls the fake in place of the provider", async () => {
    const till = chargingTill(counted);
    const instance = till.instance();
    const faked = fakeProvider(instance, "main", GATEWAY, (provide) =>
      provide({ label: "fake" }),
    );
    const result = await run(faked);
    expect([faked, result.isSucceeded(), till.calls]).toEqual([
      instance,
      true,
      [],
    ]);
  });

  it("replaces the provider for that instance alone", async () => {
    const till = chargingTill(counted);
    fakeProvider(till.instance(), "main", GATEWAY, (provide) =>
      provide({ label: "fake" }),
    );
    await run(till.instance());
    expect(till.calls).toHaveLength(2);
  });

  it("replaces a fake given before for the same provider", async () => {
    const labels: string[] = [];
    const instance = chargingTill(counted).instance();
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
      fakeProvider(orders(charge()).instance(), "main", GATEWAY, (provide) =>
        provide({ label: "fake" }),
      ),
    ).toThrow(
      new TestMistake([
        { kind: MistakeKind.UnknownProvider, provider: "main" },
      ]),
    );
  });

  it("throws a test mistake for a fake of another service than the provider makes", () => {
    const till = serviceType<{ readonly label: string }>("Till");
    expect(() =>
      fakeProvider(chargingTill(counted).instance(), "main", till, (provide) =>
        provide({ label: "fake" }),
      ),
    ).toThrow(
      new TestMistake([{ kind: MistakeKind.AnotherService, provider: "main" }]),
    );
  });
});
