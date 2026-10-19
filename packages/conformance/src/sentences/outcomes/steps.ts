import { Then } from "@cucumber/cucumber";
import { attemptsOf, type Status, statusOf } from "../../trace/status.js";
import { expectOfStream, holds } from "../../unmet.js";
import type { World } from "../../world.js";

Then<World>(
  "step {string} ended as {status} after {int} attempts",
  function (step: string, expected: Status, attempts: number) {
    const events = this.stream();
    expectOfStream(
      statusOf(events, step) === expected &&
        attemptsOf(events, step) === attempts,
      `"${step}" to end as ${expected} after ${String(attempts)} attempts`,
      events,
    );
  },
);

Then<World>("step {string} ended as aborted", function (step: string) {
  const events = this.stream();
  expectOfStream(
    statusOf(events, step) === "aborted",
    `"${step}" to end as aborted`,
    events,
  );
});

Then<World>(
  "step {string} was built {int} times, each time as a new instance",
  function (step: string, times: number) {
    const built = this.witness.built(step);
    holds(
      built.length === times && new Set(built).size === times,
      `"${step}" built ${String(times)} times, each a new instance`,
      `${String(built.length)} built, ${String(new Set(built).size)} of them distinct`,
    );
  },
);
