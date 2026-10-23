import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Event } from "../../../src/event.js";
import { type Contributor, contributor } from "../../../src/journey.js";
import {
  type Outcome,
  Step,
  type StepReporter,
  stepReporter,
} from "../../../src/step.js";
import { Ending } from "../../../src/testing/ending.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import { stepMock } from "../../../src/testing/step-mock.js";
import { charge, noon, orders, recorded, run } from "../../fixtures/engine.js";

async function pathOf(
  workflow: ReturnType<typeof orders>,
): Promise<readonly string[]> {
  return (await recorded(workflow)).path;
}

describe("travel", () => {
  it("starts the journey with its initial keys, runs its one step and succeeds", async () => {
    const recorder = new RecordingReporter();
    const instance = orders(charge()).instance(
      { order: "A-1" },
      { reporters: [recorder] },
    );
    await run(instance);
    const fixed = {
      timestamp: noon,
      journeyId: instance.journeyId,
      workflow: "orders",
    };
    expect(recorder.events).toEqual([
      {
        kind: "journey_started",
        sequence: 1,
        ...fixed,
        initialKeys: ["order"],
      },
      {
        kind: "attempt_started",
        sequence: 2,
        ...fixed,
        step: "charge",
        attempt: { number: 1 },
      },
      {
        kind: "step_succeeded",
        sequence: 3,
        ...fixed,
        step: "charge",
        attempt: { number: 1 },
      },
      {
        kind: "journey_succeeded",
        sequence: 4,
        ...fixed,
        decidedBy: "default",
      },
    ]);
  });

  it("runs the steps in their order", async () => {
    const ship = stepMock({ attempts: [Ending.success] });
    expect(await pathOf(orders(charge(), ship.builder("ship")))).toEqual([
      "charge attempt 1 succeeded",
      "ship attempt 1 succeeded",
      "journey succeeded",
    ]);
  });

  it("carries the step, the cause and the error's message on journey_failed", async () => {
    const crashing = stepMock({
      attempts: [Ending.abnormalTermination("timeout")],
    });
    const { events } = await recorded(orders(crashing.builder("charge")));
    expect(events.at(-1)).toMatchObject({
      kind: "journey_failed",
      step: "charge",
      cause: "abnormal termination",
      errorMessage: "timeout",
      decidedBy: "default",
    });
  });

  it("carries the step, the cause and the reason on journey_failed", async () => {
    const declining = stepMock({
      attempts: [Ending.failure({ code: "declined", message: "no funds" })],
    });
    const { events } = await recorded(orders(declining.builder("charge")));
    expect(events.at(-1)).toMatchObject({
      kind: "journey_failed",
      step: "charge",
      cause: "failure",
      reason: { code: "declined", message: "no funds" },
      decidedBy: "default",
    });
    expect(events.at(-1)).not.toHaveProperty("errorMessage");
  });
});

/** A step of a generated workflow: its retries, and how each attempt ends. */
interface Generated {
  readonly retryBudget: number;
  readonly noRetryOnAbnormalTermination: boolean;
  readonly attempts: readonly [Ending, ...Ending[]];
}

const ending = fc.constantFrom(
  Ending.success,
  Ending.failure("declined"),
  Ending.skip,
  Ending.abnormalTermination("timeout"),
);

const generatedStep: fc.Arbitrary<Generated> = fc.record({
  retryBudget: fc.integer({ min: 0, max: 3 }),
  noRetryOnAbnormalTermination: fc.boolean(),
  attempts: fc.tuple(ending, fc.array(ending, { maxLength: 4 })).map(joined),
});

const generatedSteps = fc.array(generatedStep, { minLength: 1, maxLength: 4 });

function joined([first, rest]: [Ending, Ending[]]): [Ending, ...Ending[]] {
  return [first, ...rest];
}

function nameOf(place: number): string {
  return `step-${String(place)}`;
}

function builderOf(generated: Generated, place: number) {
  const builder = stepMock({ attempts: generated.attempts })
    .builder(nameOf(place))
    .retryBudget(generated.retryBudget);
  return generated.noRetryOnAbnormalTermination
    ? builder.noRetryOnAbnormalTermination()
    : builder;
}

async function eventsOf(
  steps: readonly Generated[],
): Promise<readonly Event[]> {
  return (await recorded(orders(...steps.map(builderOf)))).events;
}

const outcomeFacts = new Set([
  "step_succeeded",
  "step_failed",
  "step_skipped",
  "step_abnormal_termination",
]);
const failedAttempts = new Set(["step_failed", "step_abnormal_termination"]);
const decisions = new Set(["step_retrying", "step_given_up"]);

function isOutcomeFact(event: Event): boolean {
  return outcomeFacts.has(event.kind);
}

function isFailedAttempt(event: Event): boolean {
  return failedAttempts.has(event.kind);
}

function isDecision(event: Event): boolean {
  return decisions.has(event.kind);
}

function isAttemptStarted(event: Event): boolean {
  return event.kind === "attempt_started";
}

/** The events of each attempt, from its `attempt_started` to the next one. */
function attemptsIn(events: readonly Event[]): Event[][] {
  return events.reduce<Event[][]>(byAttempt, []);
}

function byAttempt(attempts: Event[][], event: Event): Event[][] {
  if (isAttemptStarted(event)) {
    attempts.push([event]);
  } else {
    attempts.at(-1)?.push(event);
  }
  return attempts;
}

function countOf(
  events: readonly Event[],
  isCounted: (event: Event) => boolean,
): number {
  return events.filter(isCounted).length;
}

function placeFromOne(_: Event, place: number): number {
  return place + 1;
}

function isGivenUp(event: Event): boolean {
  return event.kind === "step_given_up";
}

function sequenceOf(event: Event): number {
  return event.sequence;
}

function stepOf(event: Event): string | undefined {
  return "step" in event ? event.step : undefined;
}

function attemptNumberOf(event: Event): number | undefined {
  return "attempt" in event ? event.attempt.number : undefined;
}

/** The names of the steps attempted, each once, in the order first attempted. */
function stepsAttempted(events: readonly Event[]): string[] {
  return [...new Set(events.filter(isAttemptStarted).map(stepOf))].filter(
    isName,
  );
}

function isName(name: string | undefined): name is string {
  return name !== undefined;
}

function budgetOf(steps: readonly Generated[], name: string): number {
  return steps[Number(name.slice("step-".length))]?.retryBudget ?? 0;
}

function withinBudget(steps: readonly Generated[], event: Event): boolean {
  const step = stepOf(event);
  const number = attemptNumberOf(event);
  return (
    step === undefined ||
    number === undefined ||
    number <= budgetOf(steps, step) + 1
  );
}

/**
 * Checks `check` over the events of journeys of generated workflows, each
 * given the steps its workflow was generated from.
 */
function overGeneratedJourneys(
  check: (events: readonly Event[], steps: readonly Generated[]) => void,
): Promise<void> {
  return fc.assert(
    fc.asyncProperty(generatedSteps, async (steps) => {
      check(await eventsOf(steps), steps);
    }),
  );
}

describe("travel, over generated workflows", () => {
  it("starts with journey_started and ends with journey_succeeded or journey_failed, numbering events from 1", async () => {
    await overGeneratedJourneys((events) => {
      expect(events[0]?.kind).toBe("journey_started");
      expect(["journey_succeeded", "journey_failed"]).toContain(
        events.at(-1)?.kind,
      );
      expect(events.map(sequenceOf)).toEqual(events.map(placeFromOne));
    });
  });

  it("concludes each attempt with exactly one outcome fact, and each failed one with exactly one decision", async () => {
    await overGeneratedJourneys((events) => {
      for (const attempt of attemptsIn(events)) {
        expect(countOf(attempt, isOutcomeFact)).toBe(1);
        expect(countOf(attempt, isDecision)).toBe(
          countOf(attempt, isFailedAttempt),
        );
      }
    });
  });

  it("never attempts a step more often than its retry budget allows", async () => {
    await overGeneratedJourneys((events, steps) => {
      expect(events.every((event) => withinBudget(steps, event))).toBe(true);
    });
  });

  it("attempts the steps in their order, stopping at the step given up, which fails the journey", async () => {
    await overGeneratedJourneys((events, steps) => {
      const attempted = stepsAttempted(events);
      const givenUp = events.find(isGivenUp);
      expect(attempted).toEqual(
        steps.slice(0, attempted.length).map((_, place) => nameOf(place)),
      );
      expect(events.at(-1)?.kind).toBe(
        givenUp === undefined ? "journey_succeeded" : "journey_failed",
      );
      expect(attempted.at(-1)).toBe(
        givenUp === undefined ? nameOf(steps.length - 1) : stepOf(givenUp),
      );
    });
  });
});

/**
 * A step `charge` that contributes `receipt` in an object, emits `step_info`
 * carrying the same, and succeeds.
 */
function contributing(receipt: string) {
  class Contributing extends Step {
    override async run(
      contributions: Contributor,
      reporter: StepReporter,
    ): Promise<Outcome> {
      contributions.contribute("receipt", { receipt });
      await reporter.info("charged", { receipt });
      return this.succeed();
    }
  }
  return Contributing.builder("charge").run(contributor(), stepReporter());
}

/** Events the engine emits, not those a step, hook or provider emits. */
function isEngineEvent(event: Event): boolean {
  return !/^(step|journey)_(info|warning|error)$/.test(event.kind);
}

describe("travel, over generated data", () => {
  it("never carries a value of the data bag on an engine event", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (order, receipt) => {
        const recorder = new RecordingReporter();
        await run(
          orders(contributing(receipt)).instance(
            { order: { order } },
            { reporters: [recorder] },
          ),
        );
        const engine = JSON.stringify(recorder.events.filter(isEngineEvent));
        expect(engine).not.toContain(order);
        expect(engine).not.toContain(receipt);
        expect(engine).toContain("contribution_committed");
        expect(JSON.stringify(recorder.events)).toContain(receipt);
      }),
    );
  });
});
