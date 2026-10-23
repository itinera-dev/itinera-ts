import { afterEach, describe, expect, it, vi } from "vitest";
import { journeyAborted, stepSucceeded } from "../../fixtures/event.js";
import { DebugReporter } from "../../../src/report/debug-reporter.js";

describe("DebugReporter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints each event as JSON on a line of its own", () => {
    const log = vi.spyOn(console, "log").mockReturnValue();
    const reporter = new DebugReporter();
    reporter.report(stepSucceeded());
    reporter.report(journeyAborted());
    expect(log.mock.calls).toEqual([
      [
        '{"kind":"step_succeeded","sequence":2,"timestamp":"2026-10-19T12:00:00.000Z","journeyId":"journey-1","workflow":"orders","step":"charge","attempt":1}',
      ],
      [
        '{"kind":"journey_aborted","sequence":3,"timestamp":"2026-10-19T12:00:00.000Z","journeyId":"journey-1","workflow":"orders","abort":{"reason":"reporter failed","errorMessage":"disk full"}}',
      ],
    ]);
  });
});
