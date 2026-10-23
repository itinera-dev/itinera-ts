import { None, Some } from "itinera/option";
import type { Provided } from "itinera/service";
import type { PlainValue } from "itinera/value";
import { describe, expect, it } from "vitest";
import { ModelError } from "../../src/model/error.js";
import { Providers, type ProviderScript } from "../../src/model/provider.js";
import { Played, type Provide } from "../../src/providers.js";
import {
  FirstLabeller,
  type Labeller,
  SecondLabeller,
} from "../../src/services.js";

/** What `provide` was given, as `this.provide(...)` would keep it. */
interface Kept {
  readonly instance: unknown;
  readonly data?: PlainValue;
}

const keep = ((instance: unknown, data?: PlainValue) =>
  data === undefined ? { instance } : { instance, data }) as Provide;

/**
 * The providers played, with the labeller provider `stock`, of journey
 * scope, changed as `scripting` says.
 */
function playing(
  scripting: (script: ProviderScript) => void = doNothing,
): Played {
  const providers = new Providers();
  providers.declare("stock", { key: "stock", type: "labeller" }, "journey");
  scripting(providers.provider("stock"));
  return new Played(providers);
}

function doNothing(): void {
  // The provider is left as declared.
}

/** What the provider `stock` made on a call given `answers`, synchronously. */
function made(played: Played, answers: readonly unknown[] = []): Kept {
  const provided = played.play("stock", answers, keep);
  if (provided instanceof Promise) {
    throw new Error("the provider ran asynchronously");
  }
  return provided as unknown as Kept;
}

function labelOf(kept: Kept | Provided<unknown>): string {
  return ((kept as Kept).instance as Labeller).label();
}

function requestingRegion(script: ProviderScript): void {
  script.requests.push({
    kind: "data from the workflow",
    key: "region",
    type: "string",
    optional: true,
  });
}

describe("Played", () => {
  it("labels each instance with the provider's name and how many it has made", () => {
    const played = playing();
    const labels = [made(played), made(played)].map(labelOf);
    expect(labels).toEqual(["stock 1", "stock 2"]);
  });

  it("labels each instance with the string it received for a request, unwrapping an optional one", () => {
    const played = playing((script) => {
      requestingRegion(script);
      script.labelsWith = "region";
    });
    expect(labelOf(made(played, [Some("eu")]))).toBe("eu");
  });

  it("refuses to label with a request its script does not make, as an error in the case", () => {
    const played = playing((script) => {
      script.labelsWith = "region";
    });
    expect(() => made(played)).toThrow(ModelError);
  });

  it("keeps what every call received, in order", () => {
    const played = playing(requestingRegion);
    made(played, [Some("eu")]);
    made(played, [None]);
    expect(played.callsTo("stock")).toEqual([[Some("eu")], [None]]);
  });

  it("makes instances of the implementation its script names", () => {
    const played = playing((script) => {
      script.implementation = "second labeller";
    });
    const { instance } = made(played);
    expect(instance).toBeInstanceOf(SecondLabeller);
  });

  it("supplies the data its script gives with each instance", () => {
    const played = playing((script) => {
      script.data = { kind: "value", value: { region: "eu" } };
    });
    expect(made(played)).toEqual({
      instance: new FirstLabeller("stock 1", { kind: "answers" }),
      data: { region: "eu" },
    });
  });

  it.each([
    ["on every call", undefined],
    [
      "on a call where it received the value its script names",
      { key: "region", value: "eu" },
    ],
  ])("fails %s, still counting the call", (_, when) => {
    const played = playing((script) => {
      requestingRegion(script);
      script.failure =
        when === undefined ? { message: "down" } : { message: "down", when };
    });
    expect(() => made(played, [Some("eu")])).toThrow("down");
    expect(played.callsTo("stock")).toHaveLength(1);
  });

  it("makes an instance on a call where it did not receive the value it fails on", () => {
    const played = playing((script) => {
      requestingRegion(script);
      script.failure = {
        message: "down",
        when: { key: "region", value: "us" },
      };
    });
    expect(labelOf(made(played, [Some("eu")]))).toBe("stock 1");
  });

  it("returns a promise when it emits through its reporter, emitting first", async () => {
    const said: string[] = [];
    const reporter = {
      info: (message: string) => {
        said.push(message);
        return Promise.resolve();
      },
    };
    const played = playing((script) => {
      script.actions.push({
        kind: "emit",
        level: "info",
        message: "choosing",
      });
    });
    const provided = played.play("stock", [reporter], keep);
    expect(provided).toBeInstanceOf(Promise);
    expect(labelOf(await provided)).toBe("stock 1");
    expect(said).toEqual(["choosing"]);
  });
});
