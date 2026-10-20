import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import type { Event } from "../../event.js";
import {
  type Abort,
  type Contributor,
  contributor,
  journeyId,
} from "../../journey.js";
import { None, Some } from "../../option.js";
import {
  hookReporter,
  type HookReporter,
  type OnFailure,
  type OnSuccess,
  retryCause,
  role,
} from "../../policy.js";
import { fromStep } from "../../policy/request.js";
import { StepPolicy } from "../../policy/step-policy.js";
import {
  Attempt,
  type Outcome,
  type Reason,
  Step,
  stepReporter,
} from "../../step.js";
import { attempt, error, failureReason, stepName } from "../../step/request.js";
import { Ending } from "../../testing/ending.js";
import { RecordingReporter } from "../../testing/recording-reporter.js";
import { stepMock } from "../../testing/step-mock.js";
import type { StepPolicyMock } from "../../testing/step-policy-mock.js";
import type { WorkflowPolicyMock } from "../../testing/workflow-policy-mock.js";
import { string } from "../../value/token.js";
import { fromWorkflow } from "../../workflow.js";
import {
  alarm,
  audit,
  callsOf,
  charge,
  guarded,
  orders,
  run,
} from "../fixtures.js";

const declined = Ending.failure({ code: "declined", details: { limit: 5 } });
const crashed = Ending.abnormalTermination("timeout");

/** A step `charge` that contributes `draft`, then fails. */
class Drafting extends Step {
  override run(contributing: Contributor): Outcome {
    contributing.contribute("draft", "D-1");
    return this.fail("declined");
  }
}

/** A step policy whose `on step failure` changes the reason it is given. */
class Meddling extends StepPolicy {
  failed(reason: Reason): OnFailure {
    Object.assign(reason.details ?? {}, { limit: 0 });
    return this.keepDefault();
  }
}

/** A step policy whose `on step abnormal termination` changes the error. */
class Rewording extends StepPolicy {
  terminated(error: unknown): OnFailure {
    assert(error instanceof Error);
    error.message = "reworded";
    return this.keepDefault();
  }
}

/** An error whose `details` throws when it is read. */
function withFaultyDetails(): Error {
  return Object.defineProperty(new Error("timeout"), "details", {
    enumerable: true,
    get(): never {
      throw new Error("no details");
    },
  });
}

/** An error behind a proxy that cannot list its own properties. */
function unlistable(): Error {
  return new Proxy(new Error("timeout"), {
    ownKeys(): never {
      throw new Error("no keys");
    },
  });
}

/** A step `charge` whose one attempt throws `thrown`. */
function throwing(thrown: unknown) {
  return class extends Step {
    override run(): Outcome {
      throw thrown;
    }
  }.builder("charge");
}

/** A step policy whose `on step success` emits `journey_info`. */
class Telling extends StepPolicy {
  async told(reporter: HookReporter): Promise<OnSuccess> {
    await reporter.info("checked");
    return this.keepDefault();
  }
}

function errorOf(abort: Abort | undefined): unknown {
  return abort !== undefined && "error" in abort ? abort.error : undefined;
}

function isJourneyInfo(event: Event): boolean {
  return event.kind === "journey_info";
}

/** A step `charge` whose one attempt ends as `ending`. */
function endingIn(ending: Ending) {
  return stepMock({ attempts: [ending] }).builder("charge");
}

describe("answered", () => {
  it("answers a step hook's requests in the order it declares them", async () => {
    const built: StepPolicyMock[] = [];
    const policy = alarm(built).onStepRetry(
      "onStepRetry",
      stepName(),
      attempt(),
      retryCause(),
      journeyId(),
    );
    const instance = orders(
      stepMock({ attempts: [declined, Ending.success] })
        .builder("charge")
        .retryBudget(1)
        .policy(policy),
    ).instance();
    await run(instance);
    expect(callsOf(built)).toEqual([
      {
        hook: "on step retry",
        received: ["charge", Attempt.first, "failure", instance.journeyId],
      },
    ]);
  });

  it("gives a step hook what the attempt contributed under the key, even when it failed", async () => {
    const built: StepPolicyMock[] = [];
    const policy = alarm(built).onStepFailure(
      "onStepFailure",
      fromStep("draft", string),
    );
    await run(
      orders(
        Drafting.builder("charge").run(contributor()).policy(policy),
      ).instance(),
    );
    expect(callsOf(built)).toEqual([
      { hook: "on step failure", received: ["D-1"] },
    ]);
  });

  it("gives a step hook the value under the key in the data bag", async () => {
    const built: StepPolicyMock[] = [];
    const policy = alarm(built).onStepSuccess(
      "onStepSuccess",
      fromWorkflow("order", string),
    );
    await run(orders(charge().policy(policy)).instance({ order: "A-1" }));
    expect(callsOf(built)).toEqual([
      { hook: "on step success", received: ["A-1"] },
    ]);
  });

  it("gives a hook the failure's reason as its own copy", async () => {
    const meddling = Meddling.builder("meddling").onStepFailure(
      "failed",
      failureReason(),
    );
    const result = await run(
      orders(endingIn(declined).policy(meddling)).instance(),
    );
    expect(result.failure).toEqual({
      cause: "failure",
      reason: { code: "declined", details: { limit: 5 } },
    });
  });

  it("gives a hook the error as its own copy", async () => {
    const built: StepPolicyMock[] = [];
    const rewording = Rewording.builder("rewording").onStepAbnormalTermination(
      "terminated",
      error(),
    );
    const policy = alarm(built).onStepFailure("onStepFailure", error());
    const result = await run(
      orders(endingIn(crashed).policy(rewording).policy(policy)).instance(),
    );
    expect(callsOf(built)).toEqual([
      { hook: "on step failure", received: [new Error("timeout")] },
    ]);
    expect(result.failure).toMatchObject({ error: new Error("timeout") });
  });

  it.each([
    ["has a getter that throws", withFaultyDetails()],
    ["is a proxy that cannot be copied", unlistable()],
  ])(
    "gives a hook an error that %s without aborting the journey",
    async (_, thrown) => {
      const built: StepPolicyMock[] = [];
      const policy = alarm(built).onStepFailure("onStepFailure", error());
      const result = await run(
        orders(throwing(thrown).policy(policy)).instance(),
      );
      expect(result.failure).toMatchObject({ errorMessage: "timeout" });
      expect(callsOf(built)).toHaveLength(1);
    },
  );

  it.each([
    [
      "the failure's reason, after a failure",
      declined,
      failureReason(),
      { code: "declined", details: { limit: 5 } },
    ],
    [
      "the failure's reason, optional, after a failure",
      declined,
      failureReason({ optional: true }),
      Some({ code: "declined", details: { limit: 5 } }),
    ],
    [
      "the failure's reason, optional, after an abnormal termination",
      crashed,
      failureReason({ optional: true }),
      None,
    ],
    [
      "the error, after an abnormal termination",
      crashed,
      error(),
      new Error("timeout"),
    ],
    [
      "the error, optional, after an abnormal termination",
      crashed,
      error({ optional: true }),
      Some(new Error("timeout")),
    ],
    [
      "the error, optional, after a failure",
      declined,
      error({ optional: true }),
      None,
    ],
  ])(
    "gives a request for %s what the attempt left",
    async (_, ending, request, expected) => {
      const built: StepPolicyMock[] = [];
      const policy = alarm(built).onStepFailure("onStepFailure", request);
      await run(orders(endingIn(ending).policy(policy)).instance());
      expect(callsOf(built)).toEqual([
        { hook: "on step failure", received: [expected] },
      ]);
    },
  );

  it.each([
    [
      "the failure's reason, after an abnormal termination",
      crashed,
      failureReason(),
      "failure reason",
    ],
    ["the error, after a failure", declined, error(), "error"],
  ])(
    "aborts the journey with required data missing for a required request for %s",
    async (_, ending, request, missing) => {
      const policy = alarm([]).onStepFailure("onStepFailure", request);
      const result = await run(
        orders(endingIn(ending).policy(policy)).instance(),
      );
      expect(result.abort).toEqual({
        reason: "required data missing",
        step: "charge",
        missing: {
          kind: missing,
          requester: {
            kind: "step hook",
            policy: "alarm",
            hook: "on step failure",
          },
        },
      });
    },
  );

  it("gives a hook a reporter whose events name the hook", async () => {
    const telling = Telling.builder("telling").onStepSuccess(
      "told",
      hookReporter(),
    );
    const recorder = new RecordingReporter();
    await run(
      orders(charge().policy(telling)).instance({}, { reporters: [recorder] }),
    );
    expect(recorder.events.filter(isJourneyInfo)).toMatchObject([
      {
        message: "checked",
        source: {
          kind: "step hook",
          policy: "telling",
          hook: "on step success",
          step: "charge",
          attempt: { number: 1 },
        },
      },
    ]);
  });

  it("gives a workflow hook the journey ID, the value under the key in the data bag, and the workflow object as its role", async () => {
    const built: WorkflowPolicyMock[] = [];
    const policy = audit(built).onWorkflowSuccess(
      "onWorkflowSuccess",
      journeyId(),
      fromWorkflow("order", string),
      role(),
    );
    const instance = guarded(policy, charge()).instance({ order: "A-1" });
    await run(instance);
    expect(callsOf(built)).toEqual([
      {
        hook: "on workflow success",
        received: [instance.journeyId, "A-1", instance.workflow],
      },
    ]);
    expect(callsOf(built)[0]?.received[2]).toBe(instance.workflow);
  });

  it.each([
    [
      "the step's name, to a workflow hook",
      guarded(
        audit([]).onWorkflowSuccess("onWorkflowSuccess", stepName() as never),
        charge(),
      ),
      {},
      "on workflow success of policy audit requests @stepName, which itinera does not give a workflow hook",
    ],
    [
      "what a step contributed, to a workflow hook",
      guarded(
        audit([]).onWorkflowFailure(
          "onWorkflowFailure",
          fromStep("draft", string) as never,
        ),
        endingIn(declined),
      ),
      {},
      "on workflow failure of policy audit requests @fromStep, which itinera does not give a workflow hook",
    ],
    [
      "a step reporter, to a step hook",
      orders(
        charge().policy(
          alarm([]).onStepSuccess("onStepSuccess", stepReporter() as never),
        ),
      ),
      { step: "charge" },
      "on step success of policy alarm requests @stepReporter, which itinera does not give a step hook",
    ],
  ])(
    "aborts the journey with hook failed, carrying a TypeError, for a request of %s",
    async (_, workflow, named, message) => {
      const result = await run(workflow.instance());
      expect(result.abort).toEqual({
        reason: "hook failed",
        ...named,
        errorMessage: message,
        error: new TypeError(message),
      });
      expect(errorOf(result.abort)).toBeInstanceOf(TypeError);
    },
  );
});
