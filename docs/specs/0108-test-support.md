# 0108: Test support

Tech spec for [proposal 0108](https://github.com/itinera-dev/spec/blob/main/proposals/0108-test-support.md), implemented in [#36](https://github.com/itinera-dev/itinera-ts/issues/36). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 13 what test support holds and section 14 how the conformance runner uses it.

Status: in progress. Stage 2 added the recording reporter and its path, and started the conformance runner, which uses it. The step mock and its `Ending` come in stage 3, the policy mock and the two reporter mocks with the first scenarios that need them, the rest of chapter 8 in stage 10, which lists the proposal and claims `testing`.

## API

Until 0108 is listed, test support is exported only from `itinera/unstable`. It lives in the module `testing`, `src/testing.ts`, which becomes the subpath `itinera/testing` in stage 10, so that nothing of test support is reachable without importing it, as chapter 8, 8.1 point 2 asks. No other module re-exports it: the recording reporter is a reporter, but `itinera/report` does not offer it.

### The recording reporter

`RecordingReporter`, in `src/testing/recording-reporter.ts`, implements `Reporter` and never fails. It has the three things chapter 8, 8.2 names, as read-only properties in camelCase:

- **`events`**: every event it received, in order, as a new array on each read, so a test changing what it read changes nothing the reporter keeps. The events themselves are the engine's, which freezes them.
- **`globalMetadata`**: each key with its latest value, in the order the keys were first set, as a new `Map` on each read. A `Map` keeps a key set again in its first place, which is what "the latest value of each entry" needs. The journey ID is its first entry, under `journey_id`.
- **`path`**: one line per event of the journey's flow, in order, written as chapter 8, 8.3 writes them. The lines are made by `line(event)`, in `src/testing/recording-reporter/path.ts`, a `switch` over every kind of event, so that a new kind does not compile until it says whether it has a line. An attempt is written by its `number`, a reason by its `code`, a decision by its cause or by the policy of the hook that decided it, and an abort by its reason, with the step when it names one.

## Dependencies

None of its own.

## The conformance runner

Stage 2 started the runner in `packages/conformance`, on cucumber-js 13.3.0, with `@cucumber/tag-expressions` 11.0.1 to refuse a tag expression that does not parse before anything runs. It is a package of the workspace that is never published, so neither is a dependency of `itinera`.

- **Compiled, not stripped.** `npm run conformance` builds `itinera` and the runner with `tsc`, then runs `packages/conformance/dist/main.js`, which loads `dist/support.js` into cucumber. The fixtures of later stages use legacy decorators with `emitDecoratorMetadata`, which neither Node's type stripping nor esbuild emits, so the runner is compiled as `itinera` is. It imports `itinera/unstable` through the workspace's link to the built package, the path an application takes.
- **The environment** is read by `readEnvironment`, in `src/environment.ts`: the three variables are required and none may be empty, and the tag expression must parse.
- **The scenario model**, in `src/model.ts` and its submodules, holds what the Given sentences declare as plain data: the workflow and its steps' scripts, the initial data and global metadata, how scripted reporters fail, and what the executor is given to dispatch events. A sentence that does not fit the model, such as a step scripted before the workflow is declared, throws a `ModelError`, an error in the case.
- **The sentences** are those of STEPS.md, registered in `src/sentences/`, one file per section of the catalogue. Stage 2 defines the sentences that only declare: building a workflow, data, journey IDs, the Given sentences of events and reporters and of global metadata, and a step being asynchronous. The sentences of input adapters, policies, hooks and roles, services and test support, and every When and Then sentence, come with the stages that run them. Until then their scenarios are undefined, which fails them, as a strict run does.
- **The recording dispatcher factory**, `RecordingDispatcherFactory` in `src/record.ts`, makes the dispatchers the executor is given: each delivers through a `DefaultDispatcher` to the reporter it holds first, then to the reporters it accepts, or fails as the scenario scripts it: when it is made, when a reporter is added, or when it dispatches an event of one kind. The reporter it holds is the one it is given; stage 3, which runs the first journey, gives it a `RecordingReporter` that the scenario's world keeps.
- **The report** is cucumber-js's JSON formatter, writing to `ITINERA_CONFORMANCE_REPORT`, and only the selected scenarios are in it. The summary formatter writes to standard output.

## Tests

- `tests/unit/testing/recording-reporter.test.ts`: events kept in order, the latest value of each entry of global metadata in the order first set, the path made from the events, and copies on every read.
- `tests/unit/testing/recording-reporter/path.test.ts`: the line of every event of the flow, each as chapter 8, 8.3 writes it, and no line for events outside the flow.
- `examples/recording-reporter.ts`: a recording reporter added to a dispatcher, keeping the latest value of each entry.
- `packages/conformance/src/*.test.ts` and the tests beside the model's submodules: the environment, the model and what each sentence may declare only once, tables, values and types, attempts, contributions, events a step emits, event kinds and the recording dispatcher factory.
- `packages/conformance/tests/runner.test.ts`: the built runner run on its own cases in `tests/cases`, passing a scenario of sentences it defines and reporting it as Cucumber JSON, running only what the tag expression selects, failing on an undefined sentence and on a case in error, and refusing to run without its environment.

## Open points

- **How a mock receives its script**, before stage 3: how a step mock or a policy mock, given to the builder as a class, receives its scenario's script, for example through a mock class made per scenario.

## Done when

Every scenario tagged `@proposal-0108` passes, and 108 is listed in `conformance.json` with `testing` among the capabilities. Planned for stage 10.
