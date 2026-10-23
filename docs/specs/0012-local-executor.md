# 0012: The local executor

Tech spec for [proposal 0012](https://github.com/itinera-dev/spec/blob/main/proposals/0012-local-executor.md), implemented in [#8](https://github.com/itinera-dev/itinera-ts/issues/8). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, decision 1 the single asynchronous executor and decision 6 refusals, and [architecture.md](../architecture.md) draws how a journey runs.

Status: complete, and 12 is listed in `conformance.json`. Stage 3 added `LocalExecutor`, its refusals and the private engine. Stage 4 added the rejection of an instance that `instance()` did not make, and stage 6 listed the proposal. Stage 7 added the workflow policies built before the journey, which no scenario of 0012 needs.

## API

Everything here is exported only from `itinera/unstable` while it names API of proposals not yet listed, such as the steps a workflow instance runs, as the agents' manual says. It is defined in `src/executor.ts`, which becomes the subpath `itinera/executor` then, with the refusals in `src/executor/refusal.ts`.

- **`new LocalExecutor(dispatcherFactory?)`** takes the dispatcher factory as its one optional argument, `DefaultDispatcherFactory` without it. This was the open point of #8; a constructor argument mirrors Rust's `LocalExecutor::with_dispatcher_factory` without a second way to say the same thing, and an options object can be added later without breaking it.
- **`await executor.run(instance)`** resolves to the journey's `JourneyResult` (see 0065), whatever happens inside the journey. It takes a `WorkflowInstance` that `instance()` made; one that a cast lets through is rejected with a `TypeError` (see "Before the journey").
- **`Refusal`**, an `Error` named `Refusal`, is what `run` rejects with before any journey and any event. Its `refused` is a discriminated union on `kind`: `instance ran`, `journey running`, `initial values` with the keys refused, in order, of the initial data and of the initial global metadata, and `dispatcher factory failed`, `dispatcher failed`, `global metadata not set` and `workflow policy failed`, the last with the `policy` too, each with the `error` thrown and its `errorMessage`. When failing custom code caused it, that error is also the standard `cause` of the `Refusal` (see 0083).

## Before the journey

First, `run` rejects with a `TypeError` an instance that `instance()` did not make, which only a cast lets through, since descriptors and instances are sealed (see [0062](0062-workflow-descriptors.md)). Then, in this order, each refusing the instance with no event:

1. **One journey at a time.** While the executor runs a journey, `run` refuses with `journey running`, a run-time refusal standing in for Rust's `&mut self`. The flag is cleared once `run` settles, refused or not.
2. **An instance runs once.** The engine keeps every instance handed to `run` in a `WeakSet`, so a second `run` of it, on this executor or another, refuses with `instance ran`. An instance counts as handed over even when it was refused: refusing it again rather than running it a second time keeps "at most one journey per instance" true without the engine deciding which refusals leave it fresh. This is a default the maintainer may change.
3. **Initial values.** The initial data and the initial global metadata are captured; a value that is not a value, or an entry of global metadata under `journey_id`, refuses with `initial values`, naming every key refused.
4. **The dispatcher.** The factory creates the journey's dispatcher, and each reporter of the instance is added to it, wrapped in a guard (see 0081).
5. **Global metadata.** `journey_id` is set first, then each initial entry, in order, through the dispatcher (see 0102).

Stage 7 adds building the workflow policies, in the place chapter 5 gives it.

## The engine

The private module `engine`, never exported, runs one journey: `runJourney(instance, factory, clock)` in `src/engine.ts`, with its parts in `src/engine/`. The clock is the executor's, `new Date()`, and tests give a fixed one.

- **Stateless.** Everything of a journey lives in the call: the dispatcher, the guards and their failures, the emitter and its sequence. Nothing is kept on the executor but its factory and whether it is running.
- **Any event loop.** The engine awaits whatever custom code returns, and never sets a timer, cancels or yields on its own.

## Dependencies

None of its own.

## Tests

- `tests/unit/executor.test.ts`: the default dispatcher factory, a new dispatcher per journey, `journey running` while a journey runs and the running journey unaffected, another journey once one ended or was refused, and the rejection of an instance that `instance()` did not make.
- `tests/unit/executor/refusal.test.ts`: the message of every refusal, the name `Refusal`, and the standard `cause`.
- `tests/unit/engine.test.ts`: the result of each ending, and no event and no global metadata for a refused instance.
- `tests/unit/engine/start.test.ts`: every refusal before the journey, the order of global metadata, and the initial data captured.
- `examples/local-executor.ts` and `examples/refusal.ts`.

## Done when

Done in stage 6: every scenario tagged `@proposal-0012` passes, but the one tagged `@capability-sync`, which does not run, and 12 is listed in `conformance.json`.
