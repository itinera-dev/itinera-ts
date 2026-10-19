# 0063: The executor is given a dispatcher factory

Tech spec for [proposal 0063](https://github.com/itinera-dev/spec/blob/main/proposals/0063-dispatcher-factory.md), implemented in [#24](https://github.com/itinera-dev/itinera-ts/issues/24). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0011](0011-events.md) the events and reporters.

Status: complete, and 63 is listed in `conformance.json`. Stage 1 added the dispatcher and factory interfaces, `DefaultDispatcher` and its factory. Stage 3 added `LocalExecutor`, which takes a factory, and the guards (see 0081). Stage 6 listed the proposal.

## API

These are exported only from `itinera/unstable` while they name the events and reporters of proposal 0011, not yet listed, as the agents' manual says. They are defined in `src/report.ts` and `src/report/default-dispatcher.ts`, and `src/report.ts` becomes the subpath `itinera/report` then.

- **`Dispatcher`**: `add(reporter)`, `dispatch(event)` and `setGlobalMetadata(key, value)`, named after chapter 2, 2.2's words, each returning nothing or a promise.
- **`DispatcherFactory`**: an object with `create()`, returning a dispatcher or a promise of one. An object, rather than a function, so a factory is a class an application names and can configure, as the reporters it creates dispatchers for are, and as Rust's trait is.
- **Promises.** The factory and each of a dispatcher's operations may return a promise, as reporters may, since the engine awaits whatever custom code returns (decision 1).
- **`DefaultDispatcher`** calls its reporters in the order added, awaiting each before the next. When a reporter fails, the event stops there and the failure is passed on, as chapter 2, 2.2 says. `journey_aborted` is the exception: it goes on to every reporter past a failure, then the first failure is passed on, so that it reaches every other reporter, as 0081 requires. The engine's guards keep it from the reporter that failed, as chapter 2, 2.3 point 2 requires, whatever the dispatcher. Each entry of global metadata reaches the reporters in the same order, skipping those without `receiveGlobalMetadata`, and stops at the first that fails.
- **`DefaultDispatcherFactory`** creates a new `DefaultDispatcher`, holding no reporter, each time, so every journey has its own.

`LocalExecutor` takes an optional factory and uses `DefaultDispatcherFactory` without one. A factory that fails, by throwing or rejecting, rejects `run` with the `Refusal` `dispatcher factory failed`, carrying the error, before any event (decision 6), and so does a dispatcher that fails while reporters are added, with `dispatcher failed` (see 0012). The factory creates a new dispatcher for every journey.

## Dependencies

None of its own.

## Tests

- `tests/unit/report/default-dispatcher.test.ts`: delivery to every reporter in order, waiting for a reporter that returns a promise, stopping at a reporter that fails and passing its failure on, `journey_aborted` past failing reporters with the first failure passed on, global metadata in order, waiting for a reporter that receives it asynchronously, over reporters that do not take it, stopping at a failure and passed as given; the factory creating a new dispatcher each time, sharing no reporter.
- `examples/dispatcher.ts` and `examples/dispatcher-factory.ts`: a dispatcher and a factory an application writes.
- Stage 3: the scenario "A dispatcher factory that fails is a refusal, with no event".

## Done when

Done in stage 6: every scenario tagged `@proposal-0063` passes, and 63 is listed in `conformance.json`.
