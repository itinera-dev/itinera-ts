# 0102: Global metadata passed to every reporter

Tech spec for [proposal 0102](https://github.com/itinera-dev/spec/blob/main/proposals/0102-global-metadata.md), implemented in [#33](https://github.com/itinera-dev/itinera-ts/issues/33). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0011](0011-events.md) and [0063](0063-dispatcher-factory.md) the reporters and dispatchers.

Status: complete, and 102 is listed in `conformance.json`. Stage 1 added global metadata on reporters and dispatchers, the event `global_metadata_set` and the abort reason `reserved metadata key`. Stage 3 sets it before the journey: `journey_id` first, then each initial entry in order, a value that is not a value or an entry under `journey_id` refusing the instance with `initial values`, and a reporter or dispatcher that fails refusing it with `global metadata not set` (see 0012). Stage 5 sets it from steps, through their step reporter, stage 7 from hooks, through their hook reporter, and stage 8 from service providers, through their provider reporter, and stage 8 listed the proposal.

## API

Since stage 10, its API is exported from the subpaths of its concepts.

- **`Reporter.receiveGlobalMetadata(key, value)`**, chapter 2, 2.1's **receive global metadata**, is optional. A reporter without it accepts every entry and does nothing with it. The value is a `PlainValue`, captured before it reaches any reporter (see [0056](0056-data-bag-values.md)).
- **`Dispatcher.setGlobalMetadata(key, value)`** passes one entry to its reporters; `DefaultDispatcher` does so in the order they were added, and stops at the first that fails.
- **`GlobalMetadataSet`**, in `src/event/data.ts`, carries the key and its `MetadataSource`: a step's attempt, a hook, or a provider with the step and attempt it provided for. It carries the key, never the value, as every engine event does.
- **`ReservedMetadataKey`**, in `src/event/abort.ts`, carries the step when there is one, the key, which is always `journey_id`, and who set it.
- **Set by a hook or a service provider**, through its hook reporter or provider reporter, which the same handles make as a step reporter, in `src/engine/handles.ts`: the same rules, with `global_metadata_set`, `reserved metadata key` and `not a value` naming the hook, or the provider with the step it is building and its attempt.
- **Set by a step.** `StepReporter.setGlobalMetadata(key, value)` captures the value when it is called, then, in the turn of the attempt's calls (see [0008](0008-steps.md)), sets it on the dispatcher with `Journey.setGlobalMetadata`, in `src/engine/journey.ts`, then emits `global_metadata_set` naming the step and the attempt. The promise settles once both are done. An entry under `journey_id` aborts the journey with `reserved metadata key`, and a value that is not a value with `not a value`, naming the step and the key; neither reaches a reporter nor emits `global_metadata_set`. A reporter or the dispatcher that fails on the entry, or a guard that recorded a failure the dispatcher swallowed, aborts it with `reporter failed`, as on an event, and `global_metadata_set` is not emitted. Each ends the step with the executor's signal. The entry stands however the attempt ends, since nothing is rolled back.

## Dependencies

None of its own.

## Tests

- `tests/unit/event/abort.test-d.ts`: only `journey_id` is a reserved key.
- `tests/unit/report/default-dispatcher.test.ts`: global metadata in order, waiting for a reporter that receives it asynchronously, over reporters that do not take it, stopping at a failure, and passed as given.
- `tests/unit/engine/journey.test.ts`: an entry passed on while the journey runs, and a reporter failing on it.
- `tests/unit/engine/handles.test.ts`: an entry set by a step, then `global_metadata_set`, and the aborts for `journey_id` and a value that is not a value.
- `tests/unit/engine/provider.test.ts`: an entry set by a provider, then `global_metadata_set` naming it.
- `examples/dispatcher.ts`: a reporter that keeps an entry and a dispatcher that passes it on.
- `examples/step-reporter.ts`: a step setting an entry.

## Done when

Done in stage 8: every scenario tagged `@proposal-0102` passes, and 102 is listed in `conformance.json`.
