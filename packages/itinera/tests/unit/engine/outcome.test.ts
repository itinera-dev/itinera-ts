import { describe, expect, it } from "vitest";
import { type Contributor, contributor } from "../../../src/journey.js";
import { None } from "../../../src/option.js";
import { fromStep } from "../../../src/policy/request.js";
import {
  type Outcome,
  Step,
  type StepBuilder,
  type StepClass,
} from "../../../src/step.js";
import { Ending } from "../../../src/testing/ending.js";
import { HookEnding } from "../../../src/testing/hook-ending.js";
import { stepMock } from "../../../src/testing/step-mock.js";
import type { StepPolicyMock } from "../../../src/testing/step-policy-mock.js";
import { integer, optional, string } from "../../../src/value/token.js";
import type { PlainValue } from "../../../src/value.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import {
  alarm,
  callsOf,
  charge,
  orders,
  recorded,
  run,
  kindOf,
  failingOn,
} from "../../fixtures/engine.js";

/** What one attempt of a {@link contributing} step contributes, and how it ends. */
interface Attempted {
  readonly contributes: Readonly<Record<string, PlainValue>>;
  readonly ending: Ending;
}

/**
 * The step `name`, whose attempts contribute and end as `attempts` says, the
 * last repeating, given a contributor by position.
 */
function contributing(
  name: string,
  ...attempts: readonly [Attempted, ...Attempted[]]
): StepBuilder<StepClass> {
  let made = 0;
  class Contributing extends Step {
    readonly #attempted =
      attempts[Math.min(made++, attempts.length - 1)] ?? attempts[0];

    override run(contributor: Contributor): Outcome {
      Object.entries(this.#attempted.contributes).forEach(([key, value]) => {
        contributor.contribute(key, value);
      });
      return Ending.outcome(this.#attempted.ending);
    }
  }
  return Contributing.builder(name).run(contributor());
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

const ship = stepMock({ attempts: [Ending.success] });

describe("concluded", () => {
  it("commits what a successful attempt contributed, in order, reporting each key and each value it replaced", async () => {
    const workflow = orders(
      contributing("charge", {
        contributes: { amount: 2, receipt: "R-1" },
        ending: Ending.success,
      }),
    );
    const recorder = await recorded(workflow, { amount: 1 });
    const source = { kind: "step", step: "charge" };
    expect(recorder.events.slice(3, 6)).toMatchObject([
      { kind: "contribution_committed", key: "amount", source },
      { kind: "data_overwritten", key: "amount", source },
      { kind: "contribution_committed", key: "receipt", source },
    ]);
    const result = await run(workflow.instance({ amount: 1 }));
    expect(
      result.isSucceeded() && [
        result.status.dataBag.read("amount", integer).option(),
        result.status.dataBag.read("receipt", string).option(),
      ],
    ).toMatchObject([{ value: 2 }, { value: "R-1" }]);
  });

  it("stops committing once a reporter fails on a commit, aborting the journey", async () => {
    const recorder = new RecordingReporter();
    const result = await run(
      orders(
        contributing("charge", {
          contributes: { amount: 2, receipt: "R-1" },
          ending: Ending.success,
        }),
      ).instance(
        {},
        {
          reporters: [
            recorder,
            failingOn("contribution_committed", "disk full"),
          ],
        },
      ),
    );
    expect([
      recorder.events.slice(3).map((event) => event.kind),
      result.abort?.reason,
    ]).toEqual([
      ["contribution_committed", "journey_aborted"],
      "reporter failed",
    ]);
  });

  it("discards what a skipped step contributed, and goes on to the next step", async () => {
    const workflow = orders(
      contributing("discount", {
        contributes: { discount: 10 },
        ending: Ending.skipBecause("no discount here"),
      }),
      ship.builder("ship"),
    );
    const recorder = await recorded(workflow);
    expect(recorder.events.slice(2, 4)).toMatchObject([
      {
        kind: "step_skipped",
        step: "discount",
        reason: { code: "no discount here" },
      },
      { kind: "contributions_discarded", step: "discount" },
    ]);
    expect(recorder.path).toEqual([
      "discount attempt 1 skipped: no discount here",
      "ship attempt 1 succeeded",
      "journey succeeded",
    ]);
    const result = await run(workflow.instance());
    expect(result.isSucceeded() && result.status.dataBag.keys()).toEqual([]);
  });

  it("fails the journey at a failure of a step with no retry budget, carrying its reason, and commits nothing", async () => {
    const workflow = orders(
      contributing("charge", {
        contributes: { draft: "D-1" },
        ending: Ending.failure({ code: "declined", details: { limit: 5 } }),
      }),
      ship.builder("ship"),
    );
    expect(await pathOf(workflow)).toEqual([
      "charge attempt 1 failed: declined",
      "charge given up: failure",
      "journey failed at charge: declined",
    ]);
    const result = await run(workflow.instance());
    expect([
      result.failure,
      result.isFailed() && result.status.dataBag.keys(),
    ]).toEqual([
      { cause: "failure", reason: { code: "declined", details: { limit: 5 } } },
      [],
    ]);
  });

  it("retries a failure while the retry budget lasts, committing only the attempt that succeeded", async () => {
    const workflow = orders(
      contributing(
        "charge",
        {
          contributes: { draft: "D-1" },
          ending: Ending.failure("unreachable"),
        },
        { contributes: { receipt: "R-1" }, ending: Ending.success },
      ).retryBudget(1),
    );
    expect(await pathOf(workflow)).toEqual([
      "charge attempt 1 failed: unreachable",
      "charge retrying",
      "charge attempt 2 succeeded",
      "journey succeeded",
    ]);
    const result = await run(workflow.instance());
    expect(result.isSucceeded() && result.status.dataBag.keys()).toEqual([
      "receipt",
    ]);
  });

  it("gives up a failing step once its retry budget is spent, carrying the last attempt's reason", async () => {
    const workflow = orders(
      contributing(
        "charge",
        { contributes: {}, ending: Ending.failure("unreachable") },
        { contributes: {}, ending: Ending.failure("declined") },
      ).retryBudget(1),
    );
    expect(await pathOf(workflow)).toEqual([
      "charge attempt 1 failed: unreachable",
      "charge retrying",
      "charge attempt 2 failed: declined",
      "charge given up: retries exhausted",
      "journey failed at charge: declined",
    ]);
    expect((await run(workflow.instance())).failure).toEqual({
      cause: "retries exhausted",
      reason: { code: "declined" },
    });
  });

  it("commits nothing an attempt contributed before it ended in an abnormal termination", async () => {
    const workflow = orders(
      contributing("charge", {
        contributes: { draft: "D-1" },
        ending: Ending.abnormalTermination("timeout"),
      }),
    );
    const result = await run(workflow.instance());
    expect(result.isFailed() && result.status.dataBag.keys()).toEqual([]);
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
});

describe("concluded, calling the step hooks", () => {
  it("calls on step success once what the attempt contributed is committed, and goes on to the next step when it keeps the default", async () => {
    const workflow = orders(
      contributing("charge", {
        contributes: { receipt: "R-1" },
        ending: Ending.success,
      }).policy(alarm().onStepSuccess("onStepSuccess")),
      ship.builder("ship"),
    );
    const recorder = await recorded(workflow);
    expect(recorder.events.slice(2, 5).map(kindOf)).toEqual([
      "step_succeeded",
      "contribution_committed",
      "hook_called",
    ]);
    expect(recorder.path).toEqual([
      "charge attempt 1 succeeded",
      "ship attempt 1 succeeded",
      "journey succeeded",
    ]);
  });

  it("makes the journey succeed at once, decided by the hook, when on step success finishes the workflow", async () => {
    const early = alarm([], {
      onStepSuccess: HookEnding.finishWorkflow,
    }).onStepSuccess("onStepSuccess");
    const recorder = await recorded(
      orders(charge().policy(early), ship.builder("ship")),
    );
    expect(recorder.path).toEqual([
      "charge attempt 1 succeeded",
      "journey succeeded, decided by alarm",
    ]);
    expect(recorder.events.at(-1)).toMatchObject({
      kind: "journey_succeeded",
      decidedBy: { policy: "alarm", hook: "on step success" },
    });
  });

  it("fails the journey at once for its reason, decided by the hook, when on step success fails the workflow, the step staying succeeded with its contributions committed", async () => {
    const failing = alarm([], {
      onStepSuccess: HookEnding.failWorkflow("fraud"),
    }).onStepSuccess("onStepSuccess");
    const workflow = orders(
      contributing("charge", {
        contributes: { receipt: "R-1" },
        ending: Ending.success,
      }).policy(failing),
      ship.builder("ship"),
    );
    const recorder = await recorded(workflow);
    expect(recorder.path).toEqual([
      "charge attempt 1 succeeded",
      "journey failed at charge: fraud",
    ]);
    expect(recorder.events.at(-1)).toMatchObject({
      kind: "journey_failed",
      step: "charge",
      cause: "FailWorkflow",
      reason: { code: "fraud" },
      decidedBy: { policy: "alarm", hook: "on step success" },
    });
    const result = await run(workflow.instance());
    expect([
      result.failure,
      result.isFailed() && result.status.dataBag.keys(),
    ]).toEqual([
      { cause: "FailWorkflow", reason: { code: "fraud" } },
      ["receipt"],
    ]);
  });

  it("calls no hook after a step skipped itself", async () => {
    const built: StepPolicyMock[] = [];
    await recorded(
      orders(
        stepMock({ attempts: [Ending.skip] })
          .builder("charge")
          .policy(alarm(built).onStepSuccess("onStepSuccess")),
      ),
    );
    expect(callsOf(built)).toEqual([]);
  });

  it("calls on step abnormal termination before the executor's own rule decides, giving it nothing the attempt contributed", async () => {
    const built: StepPolicyMock[] = [];
    const watched = alarm(built).onStepAbnormalTermination(
      "onStepAbnormalTermination",
      fromStep("draft", optional(string)),
    );
    const workflow = orders(
      contributing(
        "charge",
        {
          contributes: { draft: "D-1" },
          ending: Ending.abnormalTermination("timeout"),
        },
        { contributes: {}, ending: Ending.success },
      )
        .retryBudget(1)
        .policy(watched),
    );
    const recorder = await recorded(workflow);
    expect(recorder.events.slice(2, 6).map(kindOf)).toEqual([
      "step_abnormal_termination",
      "optional_input_absent",
      "hook_called",
      "step_retrying",
    ]);
    expect(callsOf(built)).toEqual([
      { hook: "on step abnormal termination", received: [None] },
    ]);
  });

  it("gives the step up at once, decided by the hook, when on step abnormal termination fails the workflow, whatever the retry budget", async () => {
    const failing = alarm([], {
      onStepAbnormalTermination: HookEnding.failWorkflow("unstable"),
    }).onStepAbnormalTermination("onStepAbnormalTermination");
    const recorder = await recorded(
      orders(
        crashing("timeout").builder("charge").retryBudget(3).policy(failing),
      ),
    );
    expect(recorder.path).toEqual([
      "charge attempt 1 terminated abnormally: timeout",
      "charge given up: FailWorkflow from alarm",
      "journey failed at charge: unstable",
    ]);
    expect(recorder.events.at(-2)).toMatchObject({
      kind: "step_given_up",
      cause: "FailWorkflow",
      reason: { code: "unstable" },
      decidedBy: { policy: "alarm", hook: "on step abnormal termination" },
    });
  });
});
