import { describe, expect, it } from "vitest";
import {
  AbortReason,
  type Abort,
  type Contributor,
  contributor,
} from "../journey.js";
import { DefaultDispatcher } from "../report/default-dispatcher.js";
import {
  type Outcome,
  Step,
  type StepClass,
  type StepName,
  stepReporter,
  type StepReporter,
} from "../step.js";
import { failureReason } from "../step/request.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import {
  FailingOn,
  journeyThrough,
  orders,
  recorded,
  run,
} from "./fixtures.js";
import type { Journey } from "./journey.js";
import { travel } from "./scan.js";

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
  return travel(journey, orders(step(journey).builder("charge")).instance());
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

  it("settles every call the step made before its outcome is reported", async () => {
    expect(kindsOf(await recorded(reporting(NotAwaiting)))).toEqual([
      "journey_started",
      "attempt_started",
      "step_info",
      "step_succeeded",
      "journey_succeeded",
    ]);
  });

  it("aborts the journey, whatever the step returns, once it was ended by the executor's signal", async () => {
    const recorder = new RecordingReporter();
    const result = await run(
      reporting(Catching).instance(
        {},
        { reporters: [recorder, new FailingOn("step_info", "disk full")] },
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
