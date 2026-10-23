# 0102: Global metadata passed to every reporter

Tech spec for [proposal 0102](https://github.com/itinera-dev/spec/blob/main/proposals/0102-global-metadata.md), implemented in [#33](https://github.com/itinera-dev/itinera-ts/issues/33). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0011](0011-events.md) and [0063](0063-dispatcher-factory.md) the reporters and dispatchers.

Status: in progress. Stage 1 added global metadata on reporters and dispatchers, the event `global_metadata_set` and the abort reason `reserved metadata key`. Setting it before the journey comes in stage 3, from steps in stage 5, from hooks in stage 7 and from providers in stage 8, which lists the proposal.

## API

Until 0102 is listed, these are exported only from `itinera/unstable`.

- **`Reporter.receiveGlobalMetadata(key, value)`**, chapter 2, 2.1's **receive global metadata**, is optional. A reporter without it accepts every entry and does nothing with it. The value is a `PlainValue`, captured before it reaches any reporter (see [0056](0056-data-bag-values.md)).
- **`Dispatcher.setGlobalMetadata(key, value)`** passes one entry to its reporters; `DefaultDispatcher` does so in the order they were added, and stops at the first that fails.
- **`GlobalMetadataSet`**, in `src/event/data.ts`, carries the key and its `MetadataSource`: a step's attempt, a hook, or a provider with the step and attempt it provided for. It carries the key, never the value, as every engine event does.
- **`ReservedMetadataKey`**, in `src/event/abort.ts`, carries the step when there is one, the key, which is always `journey_id`, and who set it.

## Dependencies

None of its own.

## Tests

- `tests/unit/event/abort.test-d.ts`: only `journey_id` is a reserved key.
- `tests/unit/report/default-dispatcher.test.ts`: global metadata in order, waiting for a reporter that receives it asynchronously, over reporters that do not take it, stopping at a failure, and passed as given.
- `examples/dispatcher.ts`: a reporter that keeps an entry and a dispatcher that passes it on.

## Done when

Every scenario tagged `@proposal-0102` passes, and 102 is listed in `conformance.json`. Planned for stage 8.
