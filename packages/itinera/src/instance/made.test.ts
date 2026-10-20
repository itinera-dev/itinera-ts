import { describe, expect, it } from "vitest";
import type { Event } from "../event.js";
import type { JourneyId } from "../journey.js";
import type { Reporter } from "../report.js";
import { Ship } from "../step/fixtures.js";
import type { Value } from "../value.js";
import { idGenerator, withStep, Workflow, workflow } from "../workflow.js";

class Audit implements Reporter {
  readonly events: Event[] = [];

  report(event: Event): void {
    this.events.push(event);
  }
}

class Tagged extends Audit {
  constructor(readonly journeyId: JourneyId) {
    super();
  }
}

function tagged(journeyId: JourneyId): Reporter {
  return new Tagged(journeyId);
}

@workflow({ name: "orders", reporters: [Audit] })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {
  @idGenerator()
  orderId(): string {
    return "order-1";
  }
}

describe("an instance", () => {
  it("cannot be changed", () => {
    expect(Object.isFrozen(Orders.build().instance())).toBe(true);
  });

  it("is made with the journey ID from the workflow's ID generator", () => {
    expect(Orders.build().instance().journeyId).toBe("order-1");
  });

  it("gives a reporter function the journey ID", () => {
    const instance = Orders.build().instance({}, { reporters: [tagged] });
    expect(instance.takeReporters().at(-1)).toStrictEqual(
      new Tagged("order-1" as JourneyId),
    );
  });

  it("holds the reporters its workflow lists before its own", () => {
    const reporter = new Tagged("own" as JourneyId);
    const instance = Orders.build().instance({}, { reporters: [reporter] });
    expect(instance.takeReporters()).toStrictEqual([new Audit(), reporter]);
  });

  it("makes new reporters of the classes its workflow lists for each instance", () => {
    const orders = Orders.build();
    const [first] = orders.instance().takeReporters();
    expect(orders.instance().takeReporters()[0]).not.toBe(first);
  });

  it("hands its reporters over once", () => {
    const instance = Orders.build().instance({}, { reporters: [new Audit()] });
    instance.takeReporters();
    expect(instance.takeReporters()).toEqual([]);
  });

  it("hands its initial global metadata over once", () => {
    const instance = Orders.build().instance(
      {},
      { reportersGlobalMetadata: [["tenant", "acme"]] },
    );
    expect([...instance.takeGlobalMetadata()]).toEqual([["tenant", "acme"]]);
    expect([...instance.takeGlobalMetadata()]).toEqual([]);
  });

  it.each([
    [
      "a map",
      new Map<string, Value>([
        ["order", "1"],
        ["7", 7],
      ]),
    ],
    [
      "entries",
      [
        ["order", "1"],
        ["7", 7],
      ] as const,
    ],
  ])("keeps initial data given as %s in the order given", (_, given) => {
    expect([...Orders.build().instance(given).initialData]).toEqual([
      ["order", "1"],
      ["7", 7],
    ]);
  });

  it("leaves out the properties of a plain object set to undefined", () => {
    const instance = Orders.build().instance({ order: "1", coupon: undefined });
    expect([...instance.initialData]).toEqual([["order", "1"]]);
  });

  it("keeps the last value of a key set twice", () => {
    const instance = Orders.build().instance(
      {},
      {
        reportersGlobalMetadata: [
          ["tenant", "acme"],
          ["tenant", "globex"],
        ],
      },
    );
    expect([...instance.takeGlobalMetadata()]).toEqual([["tenant", "globex"]]);
  });

  it("is not changed by changing the map it was given", () => {
    const given = new Map([["order", "1"]]);
    const instance = Orders.build().instance(given);
    given.set("order", "2");
    expect(instance.initialData.get("order")).toBe("1");
  });
});
