import {
  DataBag,
  Ending,
  LocalExecutor,
  None,
  type Option,
  Some,
  stepMock,
  Workflow,
} from "itinera/unstable";
import { integer, type Value } from "itinera/value";
import { describe, expect, it } from "vitest";
import { Adapters } from "../../src/adapters.js";
import {
  type Answer,
  type AdapterScript,
  unscriptedAdapter,
} from "../../src/model/adapter.js";
import type { Scripted } from "../../src/model/value.js";

class Holding extends Workflow {}

/** The data bag of a journey that starts with `data` and changes nothing. */
async function bagHolding(
  data: Readonly<Record<string, Value>>,
): Promise<DataBag> {
  const holding = Holding.builder()
    .name("holding")
    .step(stepMock({ attempts: [Ending.success] }).builder("hold"))
    .build();
  const { status } = await new LocalExecutor().run(holding.instance(data));
  if (status.kind === "aborted") {
    throw new Error("the journey was aborted");
  }
  return status.dataBag;
}

/**
 * The adapter `pricing`, attached to the steps `charge` and `ship`,
 * requesting the step name and the data bag.
 */
function pricing(): AdapterScript {
  const script = unscriptedAdapter("pricing", ["charge", "ship"]);
  script.requests.push({ kind: "step name" }, { kind: "data bag" });
  return script;
}

/** What the script replies for the input `amount` of the step `charge`. */
function replyForAmount(
  script: AdapterScript,
  answers: readonly unknown[],
): Option<Scripted> {
  return new Adapters([script]).reply("charge", "amount", answers);
}

describe("the scenario's input adapters", () => {
  it.each<[string, Answer, Option<Scripted>]>([
    [
      "a value",
      { kind: "returns", value: { kind: "value", value: 7 } },
      Some<Scripted>({ kind: "value", value: 7 }),
    ],
    ["nothing", { kind: "returns nothing" }, None],
    [
      "the step name their request is answered with",
      { kind: "returns the step name" },
      Some<Scripted>({ kind: "value", value: "refund" }),
    ],
  ])("reply as scripted: %s", (_, answer, reply) => {
    const script = pricing();
    script.answers.push({ key: "amount", answer });
    expect(replyForAmount(script, ["refund"])).toEqual(reply);
  });

  it("fail as scripted, by throwing", () => {
    const script = pricing();
    script.answers.push({
      key: "amount",
      answer: { kind: "fails", message: "down" },
    });
    expect(() => replyForAmount(script, [])).toThrow(new Error("down"));
  });

  it.each<[string, Readonly<Record<string, Value>>, Option<Scripted>]>([
    [
      "the value of the type it holds",
      { price: 7 },
      Some<Scripted>({ kind: "value", value: 7 }),
    ],
    ["nothing for a key it lacks", {}, None],
    ["nothing for a value of another type", { price: "seven" }, None],
  ])(
    "read through the access their requests are answered with: %s",
    async (_, data, reply) => {
      const script = pricing();
      script.answers.push({
        key: "amount",
        answer: {
          kind: "returns what it reads",
          key: "price",
          type: "integer",
          through: "its access",
        },
      });
      const bag = await bagHolding(data);
      expect(replyForAmount(script, ["charge", bag])).toEqual(reply);
    },
  );

  it("read through the access kept from a call for another step", async () => {
    const script = pricing();
    script.keepsAccessFor = "charge";
    script.answers.push({
      key: "amount",
      step: "ship",
      answer: {
        kind: "returns what it reads",
        key: "price",
        type: "integer",
        through: "the kept access",
      },
    });
    const adapters = new Adapters([script]);
    adapters.reply("charge", "amount", [
      "charge",
      await bagHolding({ price: 5 }),
    ]);
    expect(
      adapters.reply("ship", "amount", [
        "ship",
        await bagHolding({ price: 9 }),
      ]),
    ).toEqual(Some<Scripted>({ kind: "value", value: 5 }));
  });

  it("write through their access only a property of the object, leaving the data bag as it was", async () => {
    const script = pricing();
    script.writes.push(["price", { kind: "value", value: 0 }]);
    const bag = await bagHolding({ price: 5 });
    replyForAmount(script, ["charge", bag]);
    expect(bag.read("price", integer)).toMatchObject({ value: 5 });
  });
});
