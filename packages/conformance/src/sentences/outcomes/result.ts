import { isDeepStrictEqual } from "node:util";
import { type DataTable, Then } from "@cucumber/cucumber";
import type { Abort, DataBag, Event, Failure } from "itinera/unstable";
import { z } from "itinera/schema";
import { json, rows } from "../../model.js";
import { abortsAt } from "../../trace/status.js";
import { expectOfStream, holds, Unmet } from "../../unmet.js";
import type { World } from "../../world.js";

Then<World>(
  "the result's failure reason has the code {string}",
  function (code: string) {
    const found = failure(this);
    holds(
      found.reason?.code === code,
      `a failure whose reason has the code "${code}"`,
      JSON.stringify(found),
    );
  },
);

Then<World>(
  "the result's failure has the cause {string}",
  function (cause: string) {
    const found = failure(this);
    holds(
      found.cause === cause,
      `a failure with the cause "${cause}"`,
      `"${found.cause}"`,
    );
  },
);

Then<World>(
  "the result's failure carries the error {string}",
  function (message: string) {
    const found = failure(this);
    holds(
      found.errorMessage === message,
      `a failure carrying the error "${message}"`,
      String(found.errorMessage),
    );
  },
);

Then<World>("the result's failure carries no error", function () {
  const found = failure(this);
  holds(
    !("error" in found),
    "a failure carrying no error",
    String(found.errorMessage),
  );
});

Then<World>("the result's failure carries no reason", function () {
  const found = failure(this);
  holds(
    found.reason === undefined,
    "a failure carrying no reason",
    JSON.stringify(found.reason),
  );
});

Then<World>(
  "the result names the failed step {string} with the code {string}",
  function (step: string, code: string) {
    const found = failure(this);
    const events = this.stream();
    expectOfStream(
      found.reason?.code === code && events.some(failsAt(step)),
      `a failure with the code "${code}", whose journey_failed names "${step}"`,
      events,
    );
  },
);

function failsAt(step: string): (event: Event) => boolean {
  return (event) => isFailedAt(event, step);
}

function isFailedAt(event: Event, step: string): boolean {
  return event.kind === "journey_failed" && event.step === step;
}

/** Why the scenario's journey failed, which it must have. */
function failure(world: World): Failure {
  const { status } = world.result;
  if (status.kind !== "failed") {
    throw new Unmet(`expected the journey to fail; it ${status.kind}`);
  }
  return status.failure;
}

Then<World>(
  "the result's abort carries the error {string}",
  function (message: string) {
    const found = abort(this);
    holds(
      "error" in found && found.errorMessage === message,
      `an abort carrying the error "${message}"`,
      JSON.stringify(found),
    );
  },
);

Then<World>("the result's abort carries no error", function () {
  const found = abort(this);
  holds(
    !("error" in found),
    "an abort carrying no error",
    JSON.stringify(found),
  );
});

Then<World>(
  "the result names the step {string} as where the journey was aborted, with the abort reason {string}",
  function (step: string, reason: string) {
    const found = abort(this);
    const events = this.stream();
    expectOfStream(
      found.reason === reason && events.some(abortsAt(step)),
      `an abort "${reason}", whose journey_aborted names "${step}"`,
      events,
    );
  },
);

/** Why the scenario's journey was aborted, which it must have been. */
function abort(world: World): Abort {
  const { status } = world.result;
  if (status.kind !== "aborted") {
    throw new Unmet(`expected the journey to be aborted; it ${status.kind}`);
  }
  return status.abort;
}

Then<World>(
  "the result's data bag has no key {string}",
  function (key: string) {
    const keys = dataBag(this).keys();
    holds(
      !keys.includes(key),
      `no "${key}" in the data bag`,
      JSON.stringify(keys),
    );
  },
);

Then<World>("the result's data bag contains:", function (table: DataTable) {
  const bag = dataBag(this);
  for (const row of rows(table)) {
    const key = row.required("key");
    const expected = json(row.required("value"));
    const read = bag.read(key, z.json());
    holds(
      read.kind === "present" && isDeepStrictEqual(read.value, expected),
      `"${key}" = ${JSON.stringify(expected)} in the data bag`,
      JSON.stringify(read),
    );
  }
});

/** The data bag of the scenario's journey, which must have one. */
function dataBag(world: World): DataBag {
  const { status } = world.result;
  if (status.kind === "aborted") {
    throw new Unmet("expected a data bag; the journey was aborted");
  }
  return status.dataBag;
}

/** An aborted journey's status has no field for a data bag, so the result offers none. */
Then<World>("the result carries no data bag", function () {
  const { status } = this.result;
  holds(
    !("dataBag" in status),
    "no data bag",
    `the data bag of a journey that ${status.kind}`,
  );
});
