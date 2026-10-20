import { describe, expectTypeOf, it } from "vitest";
import type { Mistake, MistakeKind } from "./mistake.js";

describe("Mistake", () => {
  it("is of every kind of mistake, and no other", () => {
    expectTypeOf<Mistake["kind"]>().toEqualTypeOf<MistakeKind>();
  });
});
