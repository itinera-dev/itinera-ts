import { describe, expect, it } from "vitest";
import { AbortReason, type Abort } from "../../../src/journey.js";
import { DefaultDispatcher } from "../../../src/report/default-dispatcher.js";
import { Step, type Outcome, type StepClass, type StepName } from "../../../src/step.js";
import { describeStep } from "../../../src/step/descriptor.js";
import { Ending } from "../../../src/testing/ending.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import { stepMock } from "../../../src/testing/step-mock.js";
import { charge, journeyThrough, noon, orders, run } from "../../fixtures/engine.js";
import type { Journey } from "../../../src/engine/journey.js";
import { travel } from "../../../src/engine/scan.js";

async function recorded(
  workflow: ReturnType<typeof orders>,
): Promise<RecordingReporter> {
  const recorder = new RecordingReporter();
  await run(workflow.instance({}, { reporters: [recorder] }));
  return recorder;
}

async function pathOf(
  workflow: ReturnType<typeof orders>,
): Promise<readonly string[]> {
  return (await recorded(workflow)).path;
}

function crashing(first: string, ...rest: readonly string[]) {
  return stepMock({
    attempts: [
      Ending.abnormalTermination(first),
      ...rest.map(Ending.abnormalTermination),
    ],
  });
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

const unbuildable = stepMock({
  attempts: [Ending.success],
  buildFailure: "no connection",
});

const diskFull: Abort = {
  reason: AbortReason.ReporterFailed,
  step: "charge" as StepName,
  errorMessage: "disk full",
  error: new Error("disk full"),
};

function charging(step: (journey: Journey) => StepClass) {
  const journey = journeyThrough(new DefaultDispatcher());
  return travel(journey, [describeStep(step(journey), { name: "charge" })], []);
}

function caught(thrown: unknown): unknown {
  return thrown;
}

function abortingWhileRun(journey: Journey): StepClass {
  return class AbortingWhileRun extends Step {
    override run(): Outcome {
      journey.abort(diskFull);
      return this.succeed();
    }
  };
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

  it("retries an abnormal termination while the retry budget lasts", async () => {
    const flaky = stepMock({
      attempts: [Ending.abnormalTermination("timeout"), Ending.success],
    });
    expect(
      await pathOf(orders(flaky.builder("charge").retryBudget(2))),
    ).toEqual([
      "charge attempt 1 terminated abnormally: timeout",
      "charge retrying",
      "charge attempt 2 succeeded",
      "journey succeeded",
    ]);
  });

  it("gives up a step whose retry budget is spent, and fails the journey there", async () => {
    const ship = stepMock({ attempts: [Ending.success] });
    expect(
      await pathOf(
        orders(
          crashing("timeout", "down").builder("charge").retryBudget(1),
          ship.builder("ship"),
        ),
      ),
    ).toEqual([
      "charge attempt 1 terminated abnormally: timeout",
      "charge retrying",
      "charge attempt 2 terminated abnormally: down",
      "charge given up: retries exhausted",
      "journey failed at charge: down",
    ]);
  });

  it.each([
    ["with no retry budget", crashing("timeout").builder("charge")],
    [
      "that never retries an abnormal termination",
      crashing("timeout")
        .builder("charge")
        .retryBudget(3)
        .noRetryOnAbnormalTermination(),
    ],
  ])("gives up at once a step %s", async (_, step) => {
    expect(await pathOf(orders(step))).toEqual([
      "charge attempt 1 terminated abnormally: timeout",
      "charge given up: abnormal termination",
      "journey failed at charge: timeout",
    ]);
  });

  it("carries the step, the cause and the error's message on journey_failed", async () => {
    const { events } = await recorded(
      orders(crashing("timeout").builder("charge")),
    );
    expect(events.at(-1)).toMatchObject({
      kind: "journey_failed",
      step: "charge",
      cause: "abnormal termination",
      errorMessage: "timeout",
      decidedBy: "default",
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

  it("aborts the journey when a step cannot be built", async () => {
    const { events } = await recorded(orders(unbuildable.builder("charge")));
    expect(events.map((event) => event.kind)).toEqual([
      "journey_started",
      "attempt_started",
      "journey_aborted",
    ]);
    expect(events.at(-1)).toMatchObject({
      abort: {
        reason: "step could not be built",
        step: "charge",
        source: { kind: "step" },
        errorMessage: "no connection",
      },
    });
  });

  it("passes on an abort raised while a step is built as it was raised", async () => {
    let raised: unknown;
    const thrown = await charging(
      (journey) =>
        class AbortingWhileBuilt extends Step {
          constructor() {
            super();
            raised = journey.abort(diskFull);
            throw raised;
          }

          override run(): never {
            throw new Error("never run");
          }
        },
    ).catch(caught);
    expect(thrown).toBe(raised);
  });

  it("aborts the journey when it was aborted while a step ran, whatever the step returned", async () => {
    await expect(charging(abortingWhileRun)).rejects.toMatchObject({
      abort: diskFull,
    });
  });
});
