import { describe, expectTypeOf, it } from "vitest";
import type { Event, EventKind } from "./event.js";

declare const event: Event;

describe("Event", () => {
  it("has one member for each kind of event", () => {
    expectTypeOf<Event["kind"]>().toEqualTypeOf<EventKind>();
  });

  it("narrows to what its kind carries", () => {
    if (event.kind === "step_failed") {
      expectTypeOf(event.reason.code).toBeString();
    }
  });

  it("cannot be changed", () => {
    // @ts-expect-error every field is read-only
    event.sequence = 2;
  });
});
