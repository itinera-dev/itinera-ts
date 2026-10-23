import { describe, expect, it } from "vitest";
import { fixtureListing, fixtureNamed, fixtures } from "../../src/fixture.js";
import { ModelError } from "../../src/model.js";

describe("the hand-written workflows", () => {
  it.each(fixtures)("are found by the name the scenarios give: %s", (name) => {
    expect(fixtureNamed(name)).toBe(name);
  });

  it("refuses a name no hand-written workflow has", () => {
    expect(() => fixtureNamed("orders")).toThrow(
      new ModelError('no hand-written workflow is named "orders"'),
    );
  });

  it("list the steps their classes declare, in order", () => {
    expect(fixtureListing("warehouse").map(stepOf)).toEqual([
      "reserve",
      "charge",
      "ship",
    ]);
  });
});

function stepOf({ step }: { readonly step: string }): string {
  return step;
}
