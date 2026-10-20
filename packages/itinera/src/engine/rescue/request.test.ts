import { describe, expect, it } from "vitest";
import { contributor, type Contributor } from "../../journey.js";
import { None } from "../../option.js";
import { error, failureReason, input, type Outcome, Step } from "../../step.js";
import { fromRescuedStep } from "../../step/rescue.js";
import { Ending } from "../../testing/ending.js";
import {
  type RescueStepMock,
  rescueStepMock,
} from "../../testing/rescue-step-mock.js";
import { stepMock } from "../../testing/step-mock.js";
import { integer, optional, string } from "../../value/token.js";
import { kindOf, orders, recorded, run } from "../fixtures.js";

/** A step that contributes `account` = "A-1", then fails as `expired`. */
class Contributing extends Step {
  override run(contributing: Contributor): Outcome {
    contributing.contribute("account", "A-1");
    return this.fail("expired");
  }
}

/**
 * A class of rescue step mocks that succeed, keeping in `built` every one
 * built.
 */
function keeping(built: RescueStepMock[]) {
  return class extends rescueStepMock({ attempts: [Ending.success] }) {
    constructor(...needs: unknown[]) {
      super(...needs);
      built.push(this);
    }
  };
}

function inputsOf({ inputs }: RescueStepMock): readonly unknown[] {
  return inputs;
}

describe("fromRescued", () => {
  it("gives a rescue step what the failed attempt contributed, never committed, and the failure's reason, with its inputs, in the order it declares them", async () => {
    const built: RescueStepMock[] = [];
    const workflow = orders(
      Contributing.builder("charge")
        .run(contributor())
        .rescue(
          keeping(built)
            .builder()
            .needs(
              fromRescuedStep("account", string),
              input("client", string),
              failureReason(),
              error({ optional: true }),
            ),
        ),
    );
    const recorder = await recorded(workflow, { client: "c-9" });
    expect(built.map(inputsOf)).toEqual([
      ["A-1", "c-9", { code: "expired" }, None],
    ]);
    expect(recorder.events.filter(isCommitted)).toEqual([]);
  });

  it("gives a rescue step its own copy of the error that ended the attempt", async () => {
    const built: RescueStepMock[] = [];
    const thrown = new Error("unauthorised");
    class Throwing extends Step {
      override run(): Outcome {
        throw thrown;
      }
    }
    await run(
      orders(
        Throwing.builder("charge").rescue(
          keeping(built).builder().needs(error()),
        ),
      ).instance(),
    );
    const [received] = built.flatMap(inputsOf);
    expect(received).not.toBe(thrown);
    expect(received).toBeInstanceOf(Error);
    expect(received).toMatchObject({ message: "unauthorised" });
  });

  it("gives an optional request for a contribution the failed attempt did not make as absent, reported by optional_input_absent naming the rescue step", async () => {
    const built: RescueStepMock[] = [];
    const recorder = await recorded(
      orders(
        stepMock({ attempts: [Ending.failure("expired"), Ending.success] })
          .builder("charge")
          .rescue(
            keeping(built)
              .builder()
              .needs(fromRescuedStep("account", optional(string))),
          ),
      ),
    );
    expect(built.map(inputsOf)).toEqual([[None]]);
    expect(recorder.events.slice(5, 7)).toMatchObject([
      {
        kind: "optional_input_absent",
        key: "account",
        requester: { kind: "step", step: "charge_rescue" },
      },
      { kind: "step_succeeded", step: "charge_rescue" },
    ]);
  });

  it.each([
    [
      "the failure's reason",
      Ending.abnormalTermination("unauthorised"),
      failureReason(),
      "failure reason",
    ],
    ["the error", Ending.failure("expired"), error(), "error"],
  ] as const)(
    "aborts the journey with required data missing, naming the rescue step, when it requires %s and there is none",
    async (_, ending, request, missing) => {
      const workflow = orders(
        stepMock({ attempts: [ending] })
          .builder("charge")
          .rescue(keeping([]).builder().needs(request)),
      );
      const recorder = await recorded(workflow);
      expect(recorder.events.slice(-2).map(kindOf)).toEqual([
        "attempt_started",
        "journey_aborted",
      ]);
      expect((await run(workflow.instance())).abort).toEqual({
        reason: "required data missing",
        step: "charge_rescue",
        missing: { kind: missing, requester: { kind: "rescue step" } },
      });
    },
  );

  it("aborts the journey with wrong type, naming the rescue step and the key, for a contribution of another type", async () => {
    const result = await run(
      orders(
        Contributing.builder("charge")
          .run(contributor())
          .rescue(
            keeping([])
              .builder()
              .needs(fromRescuedStep("account", optional(integer))),
          ),
      ).instance(),
    );
    expect(result.abort).toEqual({
      reason: "wrong type",
      step: "charge_rescue",
      key: "account",
      requester: { kind: "step" },
    });
  });
});

function isCommitted({ kind }: { readonly kind: string }): boolean {
  return kind === "contribution_committed";
}
