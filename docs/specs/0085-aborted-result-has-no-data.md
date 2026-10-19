# 0085: An aborted journey's result carries no data bag

Tech spec for [proposal 0085](https://github.com/itinera-dev/spec/blob/main/proposals/0085-aborted-result-has-no-data.md), implemented in [#29](https://github.com/itinera-dev/itinera-ts/issues/29). [0065](0065-business-result.md) holds the result.

Status: in progress. Stage 3 added the aborted status with no data bag, and made every abort final. Stage 7 lists the proposal.

## API

- **No data bag by type.** `Aborted`, the status of an aborted journey, has `kind` and `abort` and no field that could hold a data bag, so the rule holds by type; `isAborted()` and `abort` read it without a switch.
- **An abort is final.** The engine records the first abort and throws the journey-abort error, `JourneyAbortError` in `src/engine/signal.ts`, which is never exported; only `runJourney` catches it, delivers `journey_aborted` and makes the aborted result. Nothing resumes the journey.

## Still open

What `output` does on an aborted result, settled with `output` in stage 6, and whether the engine stops committing the remaining contributions once an abort is recorded, which point 5 of the proposal leaves to the implementation and stage 5 decides.

## Dependencies

None of its own.

## Tests

- `src/engine.test.ts`: an aborted journey's result has its abort and no data bag.
- `src/journey.test-d.ts`: the data bag reached only through a status that has one.

## Done when

Every scenario tagged `@proposal-0085` passes, and 85 is listed in `conformance.json`. Planned for stage 7.
