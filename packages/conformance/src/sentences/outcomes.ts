import { Then } from "@cucumber/cucumber";
import type { JourneyStatus, Refusal } from "itinera/unstable";
import { eventKind } from "../model.js";
import { lineOf } from "../trace.js";
import { isJourneyAborted } from "../trace/status.js";
import { expectOfStream, holds, Unmet } from "../unmet.js";
import type { World } from "../world.js";

Then<World>("the last event is {string}", function (event: string) {
  const kind = eventKind(event);
  const events = this.stream();
  expectOfStream(
    events.at(-1)?.kind === kind,
    `the last event to be ${kind}`,
    events,
  );
});

Then<World>("no event was emitted", function () {
  const events = this.stream();
  expectOfStream(events.length === 0, "no event", events);
});

Then<World>("journey_aborted names no adapter", function () {
  const events = this.stream();
  const aborted = events.find(isJourneyAborted);
  expectOfStream(
    aborted !== undefined && !lineOf(aborted).cells.has("adapter"),
    "a journey_aborted naming no adapter",
    events,
  );
});

Then<World>("no step ran", function () {
  const { ran } = this.witness;
  holds(ran.length === 0, "no step to run", `${String(ran.length)} steps ran`);
});

Then<World>("the journey succeeded", function () {
  endedAs(this, "succeeded");
});

Then<World>("the journey failed", function () {
  endedAs(this, "failed");
});

Then<World>("the journey was aborted", function () {
  endedAs(this, "aborted");
});

function endedAs(world: World, expected: JourneyStatus["kind"]): void {
  const found = world.result.status.kind;
  holds(found === expected, `the journey ${expected}`, `it ${found}`);
}

Then<World>(
  "the journey was aborted with the abort reason {string}",
  function (reason: string) {
    const { status } = this.result;
    const found = status.kind === "aborted" ? status.abort.reason : status.kind;
    holds(
      found === reason,
      `the journey aborted with "${reason}"`,
      `"${found}"`,
    );
  },
);

Then<World>("run returned a result instead of throwing", function () {
  const { ended } = this.journey;
  holds(ended.kind === "result", "run to return a result", "a refusal");
});

Then<World>("run was refused", function () {
  refusal(this);
});

Then<World>(
  "run was refused with the message {string}",
  function (message: string) {
    const found = refusal(this).message;
    holds(
      found.includes(message),
      `a refusal carrying "${message}"`,
      `"${found}"`,
    );
  },
);

/** Why `run` refused the scenario's journey. */
function refusal(world: World): Refusal {
  const { ended } = world.journey;
  if (ended.kind === "result") {
    throw new Unmet(
      `expected run to be refused; the journey ${ended.result.status.kind}`,
    );
  }
  return ended.refusal;
}
