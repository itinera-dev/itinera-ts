import { describe, expect, it } from "vitest";
import { ModelError } from "../../../src/model/error.js";
import { TestSupport } from "../../../src/model/testing.js";

describe("TestSupport", () => {
  it.each([
    [
      "the recording reporter",
      (testing: TestSupport) => {
        testing.addRecordingReporter();
      },
    ],
    [
      "every step scripted",
      (testing: TestSupport) => {
        testing.ensureAll();
      },
    ],
    [
      "a failing step event reporter",
      (testing: TestSupport) => {
        testing.failStepRecorder();
      },
    ],
    [
      "a failing hook event reporter",
      (testing: TestSupport) => {
        testing.failHookRecorder();
      },
    ],
    [
      "a fake of one provider",
      (testing: TestSupport) => {
        testing.fake("stock", { kind: "makes meters" });
      },
    ],
    [
      "the script",
      (testing: TestSupport) => {
        testing.says([]);
      },
    ],
  ])("refuses %s said twice", (_, saying) => {
    const testing = new TestSupport();
    saying(testing);
    expect(() => {
      saying(testing);
    }).toThrow(ModelError);
  });

  it("refuses to read a script the scenario does not give", () => {
    expect(() => new TestSupport().script).toThrow(ModelError);
  });
});
