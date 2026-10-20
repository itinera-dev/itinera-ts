import { describe, expect, it } from "vitest";
import type { Event } from "../../../src/event.js";
import { service } from "../../../src/service/request.js";
import { contributor } from "../../../src/journey/contributor.js";
import { input } from "../../../src/step/request.js";
import { Ending } from "../../../src/testing/ending.js";
import { rescueStepMock } from "../../../src/testing/rescue-step-mock.js";
import { integer } from "../../../src/value/token.js";
import { useFake } from "../../../src/instance/made.js";
import type { ProviderName, ProviderOptions } from "../../../src/service.js";
import { provided as made } from "../../../src/service/provider/provided.js";
import type { Built } from "../../../src/workflow.js";
import { GATEWAY, kindOf, recorded, run, serviced, Till } from "../../fixtures/engine.js";

const failingOnce = {
  attempts: [Ending.failure("declined"), Ending.success],
} as const;

/** The builder of the workflow `orders` of a till. */
function orders() {
  return Till.builder().name("orders");
}

/**
 * The workflow `orders` of a till, whose steps `reserve` and `ship` each
 * request the gateway `payments`, keeping what they are lent in `lent`,
 * `reserve` failing once and retried, served by the till's `main`, as
 * `options` say.
 */
function shop(lent: unknown[][], options: ProviderOptions): Built<Till> {
  return orders()
    .step(
      serviced(lent, failingOnce)
        .builder("reserve")
        .run(service("payments", GATEWAY))
        .retryBudget(1),
    )
    .step(serviced(lent).builder("ship").run(service("payments", GATEWAY)))
    .provider("main", GATEWAY, { key: "payments", ...options })
    .constructWith()
    .build();
}

async function provided(
  till: Built<Till>,
  data: Parameters<typeof recorded>[1] = {},
): Promise<readonly Event[]> {
  const { events } = await recorded(till, data);
  return events.filter(isServiceProvided);
}

function isServiceProvided(event: Event): boolean {
  return event.kind === "service_provided";
}

describe("servicesFor", () => {
  it("lends the instance of a provider of journey scope to every attempt of every step it serves, made once", async () => {
    const lent: unknown[][] = [];
    const till = shop(lent, {});
    const events = await provided(till);
    expect(lent).toEqual([
      [{ label: "main 1" }],
      [{ label: "main 1" }],
      [{ label: "main 1" }],
    ]);
    expect(till.callsTo("main")).toBe(1);
    expect(events).toMatchObject([{ step: "reserve", attempt: { number: 1 } }]);
  });

  it("never lends the instance of a provider of journey scope to another journey", async () => {
    const till = shop([], {});
    await recorded(till);
    await recorded(till);
    expect(till.callsTo("main")).toBe(2);
  });

  it("calls the instance's fake of a provider of journey scope once, lending what it makes to every attempt", async () => {
    const lent: unknown[][] = [];
    const instance = shop(lent, {}).instance();
    let calls = 0;
    useFake(instance, "main" as ProviderName, () => {
      calls += 1;
      return made({ label: "fake" }, undefined);
    });
    await run(instance);
    expect(calls).toBe(1);
    expect(lent).toEqual([
      [{ label: "fake" }],
      [{ label: "fake" }],
      [{ label: "fake" }],
    ]);
  });

  it("calls a provider of attempt scope for every attempt of every step it serves", async () => {
    const lent: unknown[][] = [];
    const till = shop(lent, { perAttempt: true });
    const events = await provided(till);
    expect(lent).toEqual([
      [{ label: "main 1" }],
      [{ label: "main 2" }],
      [{ label: "main 3" }],
    ]);
    expect(events.map(kindOf)).toEqual([
      "service_provided",
      "service_provided",
      "service_provided",
    ]);
  });

  it("serves a step from the provider attached to it rather than from the one attached to no step", async () => {
    const lent: unknown[][] = [];
    const till = orders()
      .step(serviced(lent).builder("reserve").run(service("payments", GATEWAY)))
      .step(serviced(lent).builder("ship").run(service("payments", GATEWAY)))
      .provider("main", GATEWAY, { key: "payments" })
      .provider("spare", GATEWAY, { key: "payments", steps: ["ship"] })
      .constructWith()
      .build();
    await recorded(till);
    expect(lent).toEqual([[{ label: "main 1" }], [{ label: "spare 1" }]]);
  });

  it("resolves the services in the order the step declares them, after its inputs, and lends them to its run in place", async () => {
    const lent: unknown[][] = [];
    const till = orders()
      .step(
        serviced(lent)
          .builder("charge")
          .needs(input("amount", integer))
          .run(
            service("stock", GATEWAY),
            contributor(),
            service("payments", GATEWAY),
          ),
      )
      .provider("main", GATEWAY, { key: "payments" })
      .provider("spare", GATEWAY, { key: "stock" })
      .constructWith()
      .build();
    const events = await provided(till, { amount: 42 });
    expect(events).toMatchObject([{ key: "stock" }, { key: "payments" }]);
    const [[stock, handle, payments] = []] = lent;
    expect([stock, payments]).toEqual([
      { label: "spare 1" },
      { label: "main 1" },
    ]);
    expect(handle).toHaveProperty("contribute");
  });

  it("calls no provider for a step whose inputs abort the journey", async () => {
    const till = orders()
      .step(
        serviced([])
          .builder("charge")
          .needs(input("amount", integer))
          .run(service("payments", GATEWAY)),
      )
      .provider("main", GATEWAY, { key: "payments" })
      .constructWith()
      .build();
    const { events } = await recorded(till);
    expect(till.calls).toEqual([]);
    expect(events.at(-1)).toMatchObject({
      kind: "journey_aborted",
      abort: { reason: "required data missing" },
    });
  });

  it("calls no provider for a step that does not request its key", async () => {
    const till = orders()
      .step(serviced([]).builder("charge"))
      .provider("main", GATEWAY, { key: "payments", steps: ["charge"] })
      .constructWith()
      .build();
    await recorded(till);
    expect(till.calls).toEqual([]);
  });

  it.each<
    [string, readonly [string, ...string[]], boolean, readonly unknown[][]]
  >([
    [
      "attached to it, instead of the provider attached to no step",
      ["charge_rescue"],
      true,
      [[{ label: "main 1" }], [{ label: "spare 1" }], [{ label: "main 2" }]],
    ],
    [
      "of journey scope attached to it and to the step it rescues, the same instance",
      ["charge", "charge_rescue"],
      false,
      [[{ label: "spare 1" }], [{ label: "spare 1" }], [{ label: "spare 1" }]],
    ],
  ])(
    "lends a rescue step the service of the provider %s",
    async (_, steps, perAttempt, expected) => {
      const lent: unknown[][] = [];
      class Lending extends rescueStepMock({ attempts: [Ending.success] }) {
        override run(...services: unknown[]) {
          lent.push(services);
          return super.run();
        }
      }
      const till = orders()
        .step(
          serviced(lent, failingOnce)
            .builder("charge")
            .run(service("payments", GATEWAY))
            .rescue(Lending.builder().run(service("payments", GATEWAY))),
        )
        .provider("main", GATEWAY, { key: "payments", perAttempt: true })
        .provider("spare", GATEWAY, { key: "payments", steps, perAttempt })
        .constructWith()
        .build();
      await recorded(till);
      expect(lent).toEqual(expected);
    },
  );
});
