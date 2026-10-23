import { describe, expect, it } from "vitest";
import { contributor, type Contributor } from "../../../src/journey.js";
import { RescueStep, type RescueOutcome } from "../../../src/step/rescue.js";
import { skipped } from "../../../src/step/outcome.js";
import { Ending, type RescueEnding } from "../../../src/testing/ending.js";
import { rescueStepMock } from "../../../src/testing/rescue-step-mock.js";
import { stepMock } from "../../../src/testing/step-mock.js";
import type { StepPolicyMock } from "../../../src/testing/step-policy-mock.js";
import { string } from "../../../src/value/token.js";
import { input } from "../../../src/step.js";
import {
  alarm,
  audit,
  callsOf,
  failingOn,
  guarded,
  kindOf,
  orders,
  recorded,
  run,
} from "../../fixtures/engine.js";

const expired = Ending.failure("expired");

/**
 * The step `charge`, whose attempts end as `attempts` says, rescued by a
 * rescue step that ends as `rescue` says.
 */
function rescuedCharge(
  rescue: RescueEnding,
  ...attempts: [Ending, ...Ending[]]
) {
  return stepMock({ attempts })
    .builder("charge")
    .rescue(rescueStepMock({ attempts: [rescue] }).builder());
}

/** A rescue step that contributes `token` = "new", then succeeds. */
class Renewing extends RescueStep {
  override run(contributing: Contributor): RescueOutcome {
    contributing.contribute("token", "new");
    return this.succeed();
  }
}

describe("rescued", () => {
  it("runs the rescue step as its own attempt 1, then attempts the step again once it succeeded", async () => {
    const recorder = await recorded(
      orders(rescuedCharge(Ending.success, expired, Ending.success)),
    );
    expect(recorder.events.map(kindOf)).toEqual([
      "journey_started",
      "attempt_started",
      "step_failed",
      "step_rescuing",
      "attempt_started",
      "step_succeeded",
      "step_rescued",
      "attempt_started",
      "step_succeeded",
      "journey_succeeded",
    ]);
    expect(recorder.events.slice(3, 7)).toMatchObject([
      {
        step: "charge",
        attempt: { number: 1 },
        cause: "failure",
        rescue: "charge_rescue",
        decidedBy: "default",
      },
      { step: "charge_rescue", attempt: { number: 1 } },
      { step: "charge_rescue", attempt: { number: 1 } },
      {
        step: "charge",
        attempt: { number: 1 },
        rescue: "charge_rescue",
        decidedBy: "default",
      },
    ]);
  });

  it("commits what the rescue step contributed before step_rescued, for the step's next attempt", async () => {
    const read: unknown[] = [];
    class Charge extends stepMock({ attempts: [expired, Ending.success] }) {
      constructor(...inputs: unknown[]) {
        super(...inputs);
        read.push(...inputs);
      }
    }
    const workflow = orders(
      Charge.builder("charge")
        .needs(input("token", string))
        .rescue(Renewing.builder().run(contributor())),
    );
    const recorder = await recorded(workflow, { token: "old" });
    expect(recorder.events.slice(6, 9)).toMatchObject([
      { kind: "contribution_committed", key: "token" },
      { kind: "data_overwritten", key: "token" },
      { kind: "step_rescued" },
    ]);
    expect(recorder.events[6]).toMatchObject({
      source: { kind: "step", step: "charge_rescue" },
    });
    expect(read).toEqual(["old", "new"]);
  });

  it.each<[string, RescueEnding, readonly string[]]>([
    [
      "a failure",
      Ending.failure("no-refresh"),
      [
        "charge_rescue attempt 1 failed: no-refresh",
        "charge_rescue given up: failure",
        "journey failed at charge_rescue: no-refresh",
      ],
    ],
    [
      "an abnormal termination",
      Ending.abnormalTermination("refresh down"),
      [
        "charge_rescue attempt 1 terminated abnormally: refresh down",
        "charge_rescue given up: abnormal termination",
        "journey failed at charge_rescue: refresh down",
      ],
    ],
  ])(
    "gives a rescue step that ends in %s up at once, failing the journey because of it, and never attempts the step again",
    async (_, ending, after) => {
      const recorder = await recorded(
        orders(rescuedCharge(ending, expired, Ending.success)),
      );
      expect(recorder.path).toEqual([
        "charge attempt 1 failed: expired",
        "charge rescuing with charge_rescue",
        ...after,
      ]);
    },
  );

  it("carries the rescue step's error in the result when it ends in an abnormal termination", async () => {
    const result = await run(
      orders(
        rescuedCharge(Ending.abnormalTermination("refresh down"), expired),
      ).instance(),
    );
    expect(result.failure).toMatchObject({
      cause: "abnormal termination",
      errorMessage: "refresh down",
      error: new Error("refresh down"),
    });
  });

  it("calls no step hook for the rescue step, and only the workflow hook once it failed", async () => {
    const built: StepPolicyMock[] = [];
    const watched = alarm(built).onStepFailure("onStepFailure");
    const recorder = await recorded(
      guarded(
        audit().onWorkflowFailure("onWorkflowFailure"),
        rescuedCharge(Ending.failure("no-refresh"), expired).policy(watched),
      ),
    );
    expect(callsOf(built)).toEqual([]);
    expect(recorder.events.slice(-3).map(kindOf)).toEqual([
      "step_given_up",
      "hook_called",
      "journey_failed",
    ]);
  });

  it("aborts the journey with rescue skipped, naming the rescue step, once a rescue step that skips had its contributions discarded", async () => {
    class Skipping extends RescueStep {
      override run(contributing: Contributor): RescueOutcome {
        contributing.contribute("token", "new");
        return skipped() as unknown as RescueOutcome;
      }
    }
    const workflow = orders(
      stepMock({ attempts: [expired] })
        .builder("charge")
        .rescue(Skipping.builder().run(contributor())),
    );
    const recorder = await recorded(workflow);
    expect(recorder.events.slice(-3)).toMatchObject([
      { kind: "step_skipped", step: "charge_rescue" },
      { kind: "contributions_discarded", step: "charge_rescue" },
      {
        kind: "journey_aborted",
        abort: { reason: "rescue skipped", step: "charge_rescue" },
      },
    ]);
    const result = await run(workflow.instance());
    expect(result.abort).toEqual({
      reason: "rescue skipped",
      step: "charge_rescue",
    });
  });

  it("names the rescue step when it cannot be built, and the rescued step when step_rescued aborts the journey", async () => {
    const unbuilt = await run(
      orders(
        stepMock({ attempts: [expired] })
          .builder("charge")
          .rescue(
            rescueStepMock({
              attempts: [Ending.success],
              buildFailure: "no client",
            }).builder(),
          ),
      ).instance(),
    );
    const undelivered = await run(
      orders(rescuedCharge(Ending.success, expired, Ending.success)).instance(
        {},
        { reporters: [failingOn("step_rescued", "disk full")] },
      ),
    );
    expect([unbuilt.abort, undelivered.abort]).toMatchObject([
      {
        reason: "step could not be built",
        step: "charge_rescue",
        errorMessage: "no client",
      },
      { reason: "reporter failed", step: "charge" },
    ]);
  });
});
