import { type DataTable, Then } from "@cucumber/cucumber";
import { ModelError, rows } from "../../model.js";
import {
  attemptsOf,
  type Status,
  statusOf,
  stepStatus,
} from "../../trace/status.js";
import { expectOfStream, holds } from "../../unmet.js";
import type { World } from "../../world.js";

Then<World>(
  "step {string} ended as {status} after {int} attempts",
  function (step: string, expected: Status, attempts: number) {
    expectEndedAfter(this, step, expected, attempts);
  },
);

function expectEndedAfter(
  world: World,
  step: string,
  expected: Status,
  attempts: number,
): void {
  const events = world.stream();
  expectOfStream(
    statusOf(events, step) === expected &&
      attemptsOf(events, step) === attempts,
    `"${step}" to end as ${expected} after ${String(attempts)} attempts`,
    events,
  );
}

Then<World>("step {string} ended as aborted", function (step: string) {
  expectAborted(this, step);
});

function expectAborted(world: World, step: string): void {
  const events = world.stream();
  expectOfStream(
    statusOf(events, step) === "aborted",
    `"${step}" to end as aborted`,
    events,
  );
}

Then<World>("the steps ended as:", function (table: DataTable) {
  for (const row of rows(table)) {
    row.refuseColumnsBeyond(["step", "status", "attempts"]);
    const step = row.required("step");
    const status = stepStatus(row.required("status"));
    if (row.optional("attempts") !== undefined) {
      expectEndedAfter(this, step, status, row.count("attempts"));
    } else if (status === "aborted") {
      expectAborted(this, step);
    } else {
      throw new ModelError(
        `the row of "${step}" says no attempts, which only an aborted step may leave out`,
      );
    }
  }
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
