# 0085: An aborted journey's result carries no data bag

Tech spec for [proposal 0085](https://github.com/itinera-dev/spec/blob/main/proposals/0085-aborted-result-has-no-data.md), implemented in [#29](https://github.com/itinera-dev/itinera-ts/issues/29). [0065](0065-business-result.md) holds the result.

Status: complete, and 85 is listed in `conformance.json`. Stage 3 added the aborted status with no data bag, and made every abort final. Stage 7 listed the proposal.

## API

- **No data bag by type.** `Aborted`, the status of an aborted journey, has `kind` and `abort` and no field that could hold a data bag, so the rule holds by type; `isAborted()` and `abort` read it without a switch.
- **An abort is final.** The engine records the first abort and throws the journey-abort error, `JourneyAbortError` in `src/engine/signal.ts`, which is never exported; only `runJourney` catches it, delivers `journey_aborted` and makes the aborted result. Nothing resumes the journey.
- **No output.** `output` on an aborted result throws an `OutputError` whose problem is `aborted`, since there is no data bag to read it from (see [0065](0065-business-result.md)).

## Decided

- **Commits stop once an abort is recorded**, which point 5 of the proposal leaves to the implementation. A successful attempt's contributions are committed one at a time, each followed by its `contribution_committed`, in `src/engine/outcome.ts`; when a reporter fails on one, the emit throws the journey-abort error, so the remaining contributions are neither committed nor reported. Since an aborted result has no data bag, nothing but the events could tell. `tests/unit/engine/outcome.test.ts` checks it.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine.test.ts`: an aborted journey's result has its abort and no data bag.
- `tests/unit/journey.test-d.ts`: the data bag reached only through a status that has one.

## Done when

Done in stage 7: every scenario tagged `@proposal-0085` passes, but those that also name a proposal not yet listed, and 85 is listed in `conformance.json`.
