import { describe, expect, it } from "vitest";
import type { Place } from "../../../src/declaration/parameter.js";
import type { Tokens } from "../../../src/declaration/token.js";
import type { Event } from "../../../src/event.js";
import type { DataBag } from "../../../src/journey.js";
import { dataBag, journeyId } from "../../../src/journey/request.js";
import { None } from "../../../src/option.js";
import { Attempt } from "../../../src/step.js";
import { input, stepName } from "../../../src/step/request.js";
import {
  classOf,
  integer,
  optional,
  string,
} from "../../../src/value/token.js";
import type { Built, Supplied } from "../../../src/workflow.js";
import { key } from "../../../src/workflow/adapter.js";
import { fromWorkflow } from "../../../src/workflow/request.js";
import {
  type Adapting,
  keeping,
  Payment,
  recorded,
  run,
  Shop,
} from "../../fixtures/engine.js";

type AdapterRequests = Tokens<unknown[], Place<Shop, "adapt">>;

/**
 * A workflow whose step `charge` needs an amount and a currency, kept in
 * `needs`, adapted by `pricing`, which `answer` plays, making `requests`.
 */
function adaptedBy(
  answer: Adapting,
  requests: AdapterRequests,
  needs: unknown[][] = [],
): Built<Shop> {
  return Shop.builder()
    .name("orders")
    .step(
      keeping(needs)
        .builder("charge")
        .needs(input("amount", integer), input("currency", string)),
    )
    .inputAdapter("adapt", { steps: ["charge"], name: "pricing" }, ...requests)
    .constructWith(answer)
    .build();
}

async function travelled(
  shop: Built<Shop>,
  data: Parameters<typeof recorded>[1] = {},
): Promise<readonly Event[]> {
  return (await recorded(shop, data)).events;
}

function kinds(events: readonly Event[]): readonly string[] {
  return events.map((event) => event.kind);
}

function eurosFor(shop: Shop, inputKey: unknown): Supplied {
  return inputKey === "currency" ? shop.supplying("EUR") : shop.reading();
}

function supplyingOne(shop: Shop): Supplied {
  return shop.supplying(1);
}

describe("adapted", () => {
  it("is asked for each input of its step, in order, given what it requests", async () => {
    const shop = adaptedBy(eurosFor, [stepName(), key(), journeyId()]);
    const instance = shop.instance({ amount: 42 });
    await run(instance);
    expect(shop.calls).toEqual([
      ["charge", "amount", instance.journeyId],
      ["charge", "currency", instance.journeyId],
    ]);
  });

  it("reports the value it supplied with input_adapter_supplied", async () => {
    const events = await travelled(adaptedBy(eurosFor, [key()]), {
      amount: 42,
    });
    expect(kinds(events)).toEqual([
      "journey_started",
      "attempt_started",
      "input_adapter_supplied",
      "step_succeeded",
      "journey_succeeded",
    ]);
    expect(events[2]).toMatchObject({
      step: "charge",
      attempt: Attempt.first,
      key: "currency",
      adapter: "pricing",
    });
  });

  it("leaves the input to the data bag when it supplies nothing", async () => {
    const needs: unknown[][] = [];
    await travelled(adaptedBy(eurosFor, [key()], needs), { amount: 42 });
    expect(needs).toEqual([[42, "EUR"]]);
  });

  it("resolves its requests for data from the workflow from the data bag, in the order it declares them", async () => {
    const shop = adaptedBy(supplyingOne, [
      fromWorkflow("order", string),
      fromWorkflow("coupon", optional(string)),
    ]);
    const events = await travelled(shop, { order: "A-1" });
    expect(shop.calls[0]).toEqual(["A-1", None]);
    expect(events[2]).toMatchObject({
      kind: "optional_input_absent",
      key: "coupon",
      requester: { kind: "adapter", adapter: "pricing", step: "charge" },
    });
  });

  it("is not called when one of its requests aborts the journey, which names the adapter and the key", async () => {
    const shop = adaptedBy(supplyingOne, [
      fromWorkflow("order", string),
      fromWorkflow("coupon", string),
    ]);
    const events = await travelled(shop);
    expect(shop.calls).toEqual([]);
    expect(events.at(-1)).toMatchObject({
      abort: {
        reason: "required data missing",
        step: "charge",
        missing: {
          key: "order",
          requester: { kind: "adapter", adapter: "pricing" },
        },
      },
    });
  });

  it("reads the data bag through its access while it is called", async () => {
    const needs: unknown[][] = [];
    await travelled(adaptedBy(readPrice, [key(), dataBag()], needs), {
      price: 7,
      amount: 42,
      currency: "EUR",
    });
    expect(needs).toEqual([[7, "EUR"]]);
  });

  it("shows nothing through an access kept after its call", async () => {
    const shop = adaptedBy(reading, [dataBag()]);
    await travelled(shop, { amount: 42, currency: "EUR" });
    const [[kept]] = shop.calls as [[DataBag]];
    expect(kept.keys()).toEqual([]);
    expect(kept.read("amount", integer).kind).toBe("absent");
  });

  it.each<[string, Adapting]>([
    ["throws", throwing],
    ["returns a rejected promise", rejecting],
  ])(
    "aborts the journey with step could not be built, after input_adapter_failed, when it %s",
    async (_, answer) => {
      const events = await travelled(adaptedBy(answer, [key()]));
      expect(kinds(events)).toEqual([
        "journey_started",
        "attempt_started",
        "input_adapter_failed",
        "journey_aborted",
      ]);
      expect(events[2]).toMatchObject({ key: "amount", adapter: "pricing" });
      expect(events[3]).toMatchObject({
        abort: {
          reason: "step could not be built",
          step: "charge",
          source: { kind: "adapter", adapter: "pricing", key: "amount" },
          errorMessage: "price list unavailable",
        },
      });
    },
  );

  it("fails when it returns what supply() and fromDataBag() do not make", async () => {
    const events = await travelled(adaptedBy(() => 7 as never, [key()]));
    expect(events.at(-1)).toMatchObject({
      abort: {
        reason: "step could not be built",
        errorMessage:
          "input adapter pricing returned number, not what supply() or fromDataBag() make",
      },
    });
  });

  it("fails, carrying no error, when it supplies what is not a value", async () => {
    const events = await travelled(adaptedBy(supplyingNaN, [key()]));
    expect(kinds(events).at(-2)).toBe("input_adapter_failed");
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        abort: {
          reason: "step could not be built",
          step: "charge",
          source: { kind: "adapter", adapter: "pricing", key: "amount" },
        },
      }),
    );
  });

  it("supplies an object that serialises itself as the value it stands for", async () => {
    const needs: unknown[][] = [];
    const shop = Shop.builder()
      .name("orders")
      .step(
        keeping(needs)
          .builder("charge")
          .needs(input("payment", classOf(Payment)), input("cents", integer)),
      )
      .inputAdapter("adapt", { steps: ["charge"], name: "pricing" })
      .constructWith(supplyingAPayment)
      .build();
    await travelled(shop);
    expect(needs).toStrictEqual([[new Payment(1250), 1250]]);
  });
});

function readPrice(shop: Shop, inputKey: unknown, bag: unknown): Supplied {
  const price = (bag as DataBag).read("price", integer);
  return inputKey === "amount" && price.kind === "present"
    ? shop.supplying(price.value)
    : shop.reading();
}

function reading(shop: Shop): Supplied {
  return shop.reading();
}

function supplyingNaN(shop: Shop): Supplied {
  return shop.supplying(Number.NaN);
}

function supplyingAPayment(shop: Shop): Supplied {
  return shop.supplying(new Payment(1250));
}

function throwing(): never {
  throw new Error("price list unavailable");
}

function rejecting(): Promise<never> {
  return Promise.reject(new Error("price list unavailable"));
}
