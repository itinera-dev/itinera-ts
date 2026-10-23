import { describe, expect, it } from "vitest";
import { requestsOf } from "../../../src/declaration.js";
import { type Outcome, Step } from "../../../src/step.js";
import {
  type Contributor,
  contributor,
} from "../../../src/journey/contributor.js";

describe("contributor", () => {
  it("records a request for the contributor", () => {
    class Charge extends Step {
      override run(@contributor() contributor: Contributor): Outcome {
        contributor.contribute("charged", 40);
        return this.succeed();
      }
    }
    expect(requestsOf(Charge, "run")).toEqual([{ kind: "contributor" }]);
  });
});
