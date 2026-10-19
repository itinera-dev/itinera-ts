# 0108: Test support

Tech spec for [proposal 0108](https://github.com/itinera-dev/spec/blob/main/proposals/0108-test-support.md), implemented in [#36](https://github.com/itinera-dev/itinera-ts/issues/36). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 13 what test support holds and section 14 how the conformance runner uses it.

Status: in progress. Stage 2 added the recording reporter and its path. The step mock and its `Ending` come in stage 3, the policy mock and the two reporter mocks with the first scenarios that need them, the rest of chapter 8 in stage 10, which lists the proposal and claims `testing`.

## API

Until 0108 is listed, test support is exported only from `itinera/unstable`. It lives in the module `testing`, `src/testing.ts`, which becomes the subpath `itinera/testing` in stage 10, so that nothing of test support is reachable without importing it, as chapter 8, 8.1 point 2 asks. No other module re-exports it: the recording reporter is a reporter, but `itinera/report` does not offer it.

### The recording reporter

`RecordingReporter`, in `src/testing/recording-reporter.ts`, implements `Reporter` and never fails. It has the three things chapter 8, 8.2 names, as read-only properties in camelCase:

- **`events`**: every event it received, in order, as a new array on each read, so a test changing what it read changes nothing the reporter keeps. The events themselves are the engine's, which freezes them.
- **`globalMetadata`**: each key with its latest value, in the order the keys were first set, as a new `Map` on each read. A `Map` keeps a key set again in its first place, which is what "the latest value of each entry" needs. The journey ID is its first entry, under `journey_id`.
- **`path`**: one line per event of the journey's flow, in order, written as chapter 8, 8.3 writes them. The lines are made by `line(event)`, in `src/testing/recording-reporter/path.ts`, a `switch` over every kind of event, so that a new kind does not compile until it says whether it has a line. An attempt is written by its `number`, a reason by its `code`, a decision by its cause or by the policy of the hook that decided it, and an abort by its reason, with the step when it names one.

## Dependencies

None of its own.

## Tests

- `src/testing/recording-reporter.test.ts`: events kept in order, the latest value of each entry of global metadata in the order first set, the path made from the events, and copies on every read.
- `src/testing/recording-reporter/path.test.ts`: the line of every event of the flow, each as chapter 8, 8.3 writes it, and no line for events outside the flow.
- `examples/recording-reporter.ts`: a recording reporter added to a dispatcher, keeping the latest value of each entry.

## Open points

- **How a mock receives its script**, before stage 3: how a step mock or a policy mock, given to the builder as a class, receives its scenario's script, for example through a mock class made per scenario.

## Done when

Every scenario tagged `@proposal-0108` passes, and 108 is listed in `conformance.json` with `testing` among the capabilities. Planned for stage 10.
