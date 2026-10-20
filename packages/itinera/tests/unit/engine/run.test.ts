import { describe, expect, it } from "vitest";
import {
  AbortReason,
  type Abort,
  type Contributor,
  contributor,
} from "../../../src/journey.js";
import type { Event } from "../../../src/event.js";
import type { Reporter } from "../../../src/report.js";
import { DefaultDispatcher } from "../../../src/report/default-dispatcher.js";
import {
  type Outcome,
  Step,
  type StepClass,
  type StepName,
  stepReporter,
  type StepReporter,
} from "../../../src/step.js";
import { success } from "../../../src/step/outcome.js";
import { string } from "../../../src/value/token.js";
import { failureReason } from "../../../src/step/request.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import {
  journeyThrough,
  orders,
  recorded,
  run,
  failingOn,
} from "../../fixtures/engine.js";
import type { Journey } from "../../../src/engine/journey.js";
import type { Lent, Script } from "../../../src/engine/script.js";
import { travel } from "../../../src/engine/scan.js";

async function played(lent: Lent): Promise<Outcome> {
  lent.contributor.contribute("receipt", "R-2");
  await lent.reporter.info("played");
  return success;
}

class Lending extends Step {
  override async run(
    reporter: StepReporter,
    contributor: Contributor,
  ): Promise<Outcome> {
    contributor.contribute("receipt", "R-1");
    await reporter.info("charged");
    return this.succeed();
  }
}

class NotAwaiting extends Step {
  override run(reporter: StepReporter): Outcome {
    void reporter.info("charged");
    return this.succeed();
  }
}

class Chaining extends Step {
  override run(reporter: StepReporter): Outcome {
    void chained(reporter);
    return this.succeed();
  }
}

async function chained(reporter: StepReporter): Promise<void> {
  await reporter.info("first");
  await reporter.info("second");
}

/** A reporter that takes its time over each event, noting when each starts and ends. */
class Slow implements Reporter {
  readonly noted: string[] = [];

  async report(event: Event): Promise<void> {
    this.noted.push(`start ${event.kind}`);
    await new Promise((resolve) => setTimeout(resolve, 1));
    this.noted.push(`end ${event.kind}`);
  }
}

class Catching extends Step {
  override async run(reporter: StepReporter): Promise<Outcome> {
    try {
      await reporter.info("charged");
    } catch {
      // A step that catches the executor's signal and carries on.
    }
    return this.succeed();
  }
}

class FailingWithNonValue extends Step {
  override run(): Outcome {
    return this.fail({ code: "declined", details: Number.NaN });
  }
}

const kept: Contributor[] = [];

class Keeping extends Step {
  override run(contributor: Contributor): Outcome {
    kept.push(contributor);
    return this.succeed();
  }
}

class Returning extends Step {
  override run(): never {
    return 42 as never;
  }
}

class Throwing extends Step {
  override run(): never {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- custom code may throw what is not an error
    throw "gateway down";
  }
}

const diskFull: Abort = {
  reason: AbortReason.ReporterFailed,
  step: "charge" as StepName,
  errorMessage: "disk full",
  error: new Error("disk full"),
};

function charging(step: (journey: Journey) => StepClass) {
  const journey = journeyThrough(new DefaultDispatcher());
  return travel(
    journey,
    orders(step(journey).builder("charge")).instance(),
    [],
  );
}

function abortingWhileRun(journey: Journey): StepClass {
  return class AbortingWhileRun extends Step {
    override run(): Outcome {
      journey.abort(diskFull);
      return this.succeed();
    }
  };
}

async function pathOf(
  workflow: ReturnType<typeof orders>,
): Promise<readonly string[]> {
  return (await recorded(workflow)).path;
}

function kindsOf(recorder: RecordingReporter): readonly string[] {
  return recorder.events.map((event) => event.kind);
}

/** A class of steps whose `run` requests only a step reporter. */
type ReportingClass = StepClass &
  (new () => Step & {
    run(reporter: StepReporter): Outcome | Promise<Outcome>;
  });

function reporting(step: ReportingClass) {
  return orders(step.builder("charge").run(stepReporter()));
}

describe("ran", () => {
  it("lends a step's run the handles it requests, in the order it requests them", async () => {
    const recorder = await recorded(
      orders(Lending.builder("charge").run(stepReporter(), contributor())),
    );
    expect(recorder.events.slice(2, 5)).toMatchObject([
      { kind: "step_info", message: "charged" },
      { kind: "step_succeeded" },
      { kind: "contribution_committed", key: "receipt" },
    ]);
  });

  it("plays what a script gives an attempt in place of the step's run, lending it the attempt's contributor and reporter", async () => {
    const recorder = new RecordingReporter();
    const script: Script = {
      building: () => undefined,
      play: () => played,
    };
    const result = await run(
      orders(
        Lending.builder("charge").run(stepReporter(), contributor()),
      ).instance({}, { reporters: [recorder] }),
      undefined,
      script,
    );
    expect(recorder.events.slice(2, 5)).toMatchObject([
      { kind: "step_info", message: "played" },
      { kind: "step_succeeded" },
      { kind: "contribution_committed", key: "receipt" },
    ]);
    expect(result.output({ receipt: string })).toEqual({ receipt: "R-2" });
  });

  it("settles every call the step made before its outcome is reported", async () => {
    expect(kindsOf(await recorded(reporting(NotAwaiting)))).toEqual([
      "journey_started",
      "attempt_started",
      "step_info",
      "step_succeeded",
      "journey_succeeded",
    ]);
  });

  it("waits for the calls a step made while its earlier calls settled before reporting its outcome", async () => {
    const slow = new Slow();
    await run(reporting(Chaining).instance({}, { reporters: [slow] }));
    expect(slow.noted.slice(4, 9)).toEqual([
      "start step_info",
      "end step_info",
      "start step_info",
      "end step_info",
      "start step_succeeded",
    ]);
  });

  it("aborts the journey, whatever the step returns, once it was ended by the executor's signal", async () => {
    const recorder = new RecordingReporter();
    const result = await run(
      reporting(Catching).instance(
        {},
        {
          reporters: [recorder, failingOn("step_info", "disk full")],
        },
      ),
    );
    expect([kindsOf(recorder), result.abort?.reason]).toEqual([
      ["journey_started", "attempt_started", "step_info", "journey_aborted"],
      "reporter failed",
    ]);
  });

  it("aborts the journey with not a value, reporting no outcome, when the reason's details are not a value", async () => {
    const recorder = await recorded(
      orders(FailingWithNonValue.builder("charge")),
    );
    expect(kindsOf(recorder)).toEqual([
      "journey_started",
      "attempt_started",
      "journey_aborted",
    ]);
    expect(recorder.events.at(-1)).toMatchObject({
      abort: { reason: "not a value", step: "charge" },
    });
  });

  it("closes the handles once the attempt ended", async () => {
    await recorded(orders(Keeping.builder("charge").run(contributor())));
    expect(() => {
      kept.at(-1)?.contribute("stale", 1);
    }).toThrow(
      "the contributor of attempt 1 of step charge was used after the attempt ended",
    );
  });

  it("aborts the journey with step could not be built for a request a step's run is not lent", async () => {
    const recorder = await recorded(
      orders(Keeping.builder("charge").run(failureReason() as never)),
    );
    expect(recorder.events.at(-1)).toMatchObject({
      abort: {
        reason: "step could not be built",
        step: "charge",
        source: { kind: "step" },
        errorMessage:
          "the run of step charge requests @failureReason, which itinera does not lend a step's run",
      },
    });
  });

  it("ends in an abnormal termination an attempt whose run returns what is not an outcome", async () => {
    expect(await pathOf(orders(Returning.builder("charge")))).toEqual([
      "charge attempt 1 terminated abnormally: step charge returned number, not an outcome made with its helpers",
      "charge given up: abnormal termination",
      "journey failed at charge: step charge returned number, not an outcome made with its helpers",
    ]);
  });

  it("takes the text of what is thrown that is not an error as its message", async () => {
    expect(await pathOf(orders(Throwing.builder("charge")))).toContain(
      "charge attempt 1 terminated abnormally: gateway down",
    );
  });

  it("aborts the journey when it was aborted while a step ran, whatever the step returned", async () => {
    await expect(charging(abortingWhileRun)).rejects.toMatchObject({
      abort: diskFull,
    });
  });
});
