import { describe, it } from "vitest";
import type { WorkflowInstance } from "../../../src/instance.js";
import { serviceType } from "../../../src/service/request.js";
import { fakeProvider } from "../../../src/testing/fake-provider.js";

interface Gateway {
  readonly label: string;
}

interface Meter {
  reading(): number;
}

const GATEWAY = serviceType<Gateway>("Gateway");

declare const instance: WorkflowInstance;
declare const meter: Meter;

describe("fakeProvider", () => {
  it("makes the provider's service", () => {
    fakeProvider(instance, "gateway", GATEWAY, (provide) =>
      // @ts-expect-error a meter is not the gateway the provider makes
      provide(meter),
    );
  });

  it("supplies only data that is a value", () => {
    fakeProvider(instance, "gateway", GATEWAY, (provide) =>
      // @ts-expect-error a date is not a value
      provide({ label: "fake" }, new Date()),
    );
  });
});
