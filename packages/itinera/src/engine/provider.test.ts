import { describe, expect, it } from "vitest";
import type { Event } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { Provided, ProviderReporter } from "../service.js";
import { providerReporter } from "../service/reporter.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import { string } from "../value/token.js";
import { fromWorkflow } from "../workflow/request.js";
import {
  chargingTill,
  counted,
  failingOn,
  kindOf,
  type Gateway,
  type Providing,
  recorded,
  run,
  Till,
  travelled,
} from "./fixtures.js";

class Terminal {
  readonly label = "terminal";
}

function terminal(till: Till): ReturnType<Providing> {
  return till.lending(new Terminal());
}

function anonymous(till: Till): ReturnType<Providing> {
  return till.lending(
    new (class {
      readonly label = "anonymous";
    })(),
  );
}

function withData(till: Till): ReturnType<Providing> {
  return till.lending({ label: "main" }, { region: "eu" });
}

function withNonValue(till: Till): ReturnType<Providing> {
  return till.lending({ label: "main" }, { at: new Date() } as never);
}

function throwing(): never {
  throw new Error("gateway down");
}

async function rejecting(): Promise<never> {
  return Promise.reject(new Error("gateway down"));
}

function returningNothing(): ReturnType<Providing> {
  return undefined as never;
}

function returningBare(): ReturnType<Providing> {
  return { label: "bare" } as never;
}

async function reportingFirst(
  till: Till,
  provider: string,
  reporter: unknown,
): Promise<Provided<Gateway>> {
  const reporting = reporter as ProviderReporter;
  await reporting.info("choosing", { gateway: "main" });
  await reporting.setGlobalMetadata("gateway", "main");
  return counted(till, provider);
}

function errorMessageOf(event: Event | undefined): unknown {
  return event?.kind === "journey_aborted"
    ? Reflect.get(event.abort, "errorMessage")
    : undefined;
}

/** A provider that keeps the reporter it is lent in `kept`. */
function keepingReporter(kept: ProviderReporter[]): Providing {
  return (till, provider, reporter) => {
    kept.push(reporter as ProviderReporter);
    return counted(till, provider);
  };
}

describe("providedBy", () => {
  it("is not called when one of its requests aborts the journey, which names it and the key", async () => {
    const till = chargingTill(counted, [fromWorkflow("gateway", string)]);
    const events = await travelled(till);
    expect(till.calls).toEqual([]);
    expect(events.at(-1)).toMatchObject({
      kind: "journey_aborted",
      abort: {
        reason: "required data missing",
        step: "charge",
        missing: {
          kind: "key",
          key: "gateway",
          requester: { kind: "provider", provider: "main" },
        },
      },
    });
  });

  it.each([
    ["the class of the instance", terminal, "Terminal"],
    ["the service type, for a plain object", counted, "Gateway"],
    ["the service type, for an anonymous class", anonymous, "Gateway"],
  ])(
    "reports the instance it made with service_provided, naming %s as the implementation",
    async (_, providing, implementation) => {
      const events = await travelled(chargingTill(providing));
      expect(events[2]).toMatchObject({
        kind: "service_provided",
        step: "charge",
        attempt: { number: 1 },
        key: "payments",
        provider: "main",
        implementation,
      });
      expect(events[2]).not.toHaveProperty("data");
    },
  );

  it("reports the data it supplied with the instance, captured", async () => {
    const events = await travelled(chargingTill(withData));
    expect(events[2]).toMatchObject({
      kind: "service_provided",
      data: { region: "eu" },
    });
  });

  it("aborts the journey with not a value, reporting no service event, when its data is not a value", async () => {
    const events = await travelled(chargingTill(withNonValue));
    expect(events.map(kindOf)).toEqual([
      "journey_started",
      "attempt_started",
      "journey_aborted",
    ]);
    expect(events[2]).toMatchObject({
      abort: {
        reason: "not a value",
        step: "charge",
        source: { kind: "provider", provider: "main" },
        eventKind: "service_provided",
      },
    });
  });

  it.each([
    ["throws", throwing],
    ["rejects", rejecting],
  ])(
    "aborts the journey with step could not be built, after service_provider_failed, carrying the error, when it %s",
    async (_, providing) => {
      const recorder = new RecordingReporter();
      const result = await run(
        chargingTill(providing).instance({}, { reporters: [recorder] }),
      );
      expect(result.abort).toEqual({
        reason: "step could not be built",
        step: "charge",
        source: { kind: "provider", provider: "main" },
        errorMessage: "gateway down",
        error: new Error("gateway down"),
      });
      expect(recorder.events.map(kindOf).slice(2)).toEqual([
        "service_provider_failed",
        "journey_aborted",
      ]);
    },
  );

  it.each([
    ["nothing, carrying no error", returningNothing, undefined],
    [
      "what provide() does not make, carrying why",
      returningBare,
      "service provider main returned object, not what provide() makes",
    ],
  ])("fails when it returns %s", async (_, providing, errorMessage) => {
    const events = await travelled(chargingTill(providing));
    expect(events.map(kindOf).slice(2)).toEqual([
      "service_provider_failed",
      "journey_aborted",
    ]);
    expect(events[2]).toMatchObject({
      step: "charge",
      key: "payments",
      provider: "main",
    });
    expect(events[3]).toMatchObject({
      abort: { reason: "step could not be built" },
    });
    expect(errorMessageOf(events[3])).toBe(errorMessage);
  });

  it("emits its own events and sets global metadata through its reporter, naming it, before service_provided", async () => {
    const till = chargingTill(reportingFirst, [providerReporter()]);
    const recorder = await recorded(till);
    const source = {
      kind: "provider",
      provider: "main",
      step: "charge",
      attempt: { number: 1 },
    };
    expect(recorder.events.slice(2, 5)).toMatchObject([
      {
        kind: "journey_info",
        source,
        message: "choosing",
        data: { gateway: "main" },
      },
      { kind: "global_metadata_set", key: "gateway", source },
      { kind: "service_provided" },
    ]);
    expect(recorder.globalMetadata.get("gateway")).toBe("main");
  });

  it("ends at the call on which a reporter fails, and no service event follows", async () => {
    const till = chargingTill(reportingFirst, [providerReporter()]);
    const recorder = new RecordingReporter();
    const failing = failingOn(EventKind.JourneyInfo, "audit down");
    const result = await run(
      till.instance({}, { reporters: [recorder, failing] }),
    );
    expect(result.abort).toMatchObject({
      reason: "reporter failed",
      step: "charge",
    });
    expect(recorder.events.map(kindOf)).toEqual([
      "journey_started",
      "attempt_started",
      "journey_info",
      "journey_aborted",
    ]);
  });

  it("refuses its reporter once its call has returned", async () => {
    const keptReporters: ProviderReporter[] = [];
    await run(
      chargingTill(keepingReporter(keptReporters), [
        providerReporter(),
      ]).instance(),
    );
    const [kept] = keptReporters;
    expect(() => kept?.info("late")).toThrow(
      new Error(
        "the provider reporter of service provider main, for attempt 1 of step charge was used after it returned",
      ),
    );
  });
});
