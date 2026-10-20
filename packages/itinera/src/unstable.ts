/**
 * API that may change in any release: what the specification has not
 * accepted yet, or what itinera does not fully implement yet. Each item moves
 * to the subpath of its concept once itinera implements it fully.
 *
 * - Test support, which moves to `itinera/testing`: the recording
 *   reporters, from {@link RecordingReporter}; the mocks, from
 *   {@link stepMock}; {@link fakeProvider}; {@link scripted} and its
 *   {@link ScriptedRun}; the recorders {@link Contributions},
 *   {@link StepEventReporter} and {@link HookEventReporter};
 *   {@link TestDataBag}; and {@link TestMistake}.
 *
 * {@includeCode ../examples/recording-reporter.ts}
 *
 * @module
 */
export * from "./testing.js";
