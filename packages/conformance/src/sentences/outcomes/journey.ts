import { type DataTable, Then } from "@cucumber/cucumber";
import type { Event } from "itinera/event";
import { rows, type Row } from "../../model.js";
import { expectOfStream, holds, Unmet } from "../../unmet.js";
import type { World } from "../../world.js";

const uuidV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Then<World>("the journey ID is a UUID v4", function () {
  const found = this.journey.journeyId;
  holds(uuidV4.test(found), "a UUID v4", `"${found}"`);
});

Then<World>("the journey ID is {string}", function (id: string) {
  const found = this.journey.journeyId;
  holds(found === id, `the journey ID "${id}"`, `"${found}"`);
});

Then<World>("the result's journey ID is {string}", function (id: string) {
  const found = this.result.journeyId;
  holds(found === id, `the result's journey ID "${id}"`, `"${found}"`);
});

Then<World>("no journey ID was produced", function () {
  holds(
    this.journeys.length === 0,
    "no workflow instance, so no journey ID",
    `${String(this.journeys.length)} journeys`,
  );
});

/** `journey_started` holds the keys only, never their values. */
Then<World>(
  "the journey_started event lists the initial keys {names} without their values",
  function (keys: string[]) {
    const events = this.stream();
    const started = events.find(isJourneyStarted);
    expectOfStream(
      started !== undefined && sameKeys(started, keys),
      `journey_started to list ${JSON.stringify(keys)}`,
      events,
    );
  },
);

function isJourneyStarted(event: Event): boolean {
  return event.kind === "journey_started";
}

function sameKeys(event: Event, keys: readonly string[]): boolean {
  return (
    event.kind === "journey_started" &&
    JSON.stringify(event.initialKeys.toSorted()) ===
      JSON.stringify(keys.toSorted())
  );
}

Then<World>(
  "admission is refused with the violations:",
  function (table: DataTable) {
    const admission = this.admission;
    if (admission.kind === "admitted") {
      throw new Unmet("expected admission to be refused; it was admitted");
    }
    const expected = rows(table).map(violationOf).toSorted();
    const found = admission.violations.violations.map(kindOf).toSorted();
    holds(
      JSON.stringify(found) === JSON.stringify(expected),
      `the violations ${JSON.stringify(expected)}`,
      JSON.stringify(found),
    );
  },
);

function violationOf(row: Row): string {
  return row.required("violation");
}

function kindOf(violation: { readonly kind: string }): string {
  return violation.kind;
}

Then<World>(
  "no contribution of {string} was committed",
  function (key: string) {
    const events = this.stream();
    expectOfStream(
      !events.some(committing(key)),
      `no contribution_committed of "${key}"`,
      events,
    );
  },
);

function committing(key: string): (event: Event) => boolean {
  return (event) => isCommitOf(event, key);
}

function isCommitOf(event: Event, key: string): boolean {
  return event.kind === "contribution_committed" && event.key === key;
}
