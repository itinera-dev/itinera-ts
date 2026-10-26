import { describe, it } from "vitest";
import { Ending } from "../../../src/testing/ending.js";
import { stepMock } from "../../../src/testing/step-mock.js";

describe("stepMock", () => {
  it("refuses static data on a class extending it", () => {
    class Counter extends stepMock({ attempts: [Ending.success] }) {
      static attempts = 0;
    }
    // @ts-expect-error a step keeps no static data
    Counter.builder("counter");
  });
});
