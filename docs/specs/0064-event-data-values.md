# 0064: Event data and reason details are values, serialised only by reporters

Tech spec for [proposal 0064](https://github.com/itinera-dev/spec/blob/main/proposals/0064-event-data-values.md), implemented in [#25](https://github.com/itinera-dev/itinera-ts/issues/25). [0056](0056-data-bag-values.md) holds what a value is and the one function that captures it, and [0011](0011-events.md) the events.

Status: complete, and 64 is listed in `conformance.json`. Stage 5 captured the data a step attaches to its events and the details of a reason. Stage 6 listed the proposal. Stage 7 captures the data hooks attach to theirs, in the same way. Since stage 10, its API is exported from the subpaths of its concepts.

## API

- **Event data.** A step reporter's `info`, `warning` and `error` take a message and optional data typed `T & AsValue<T>`, as every value an application gives is, so functions, `undefined`, symbols, `bigint`, `Date`, `Map` and objects with methods do not compile there (see 0056).
- **Reasons.** `this.fail(reason)` and `this.skipBecause(reason)` take a code alone or `{ code, message, details }`, the details typed in the same way.

## Captured, never serialised

- **Event data** is captured by `capture`, in `src/value/capture.ts`, when it is emitted, in `src/engine/handles.ts`: `toValue()` for an object that serialises itself, the check, and the copy. The event carries the copy, frozen with the rest of the event; the executor never serialises it, which is left to reporters.
- **A reason's details** are captured when the reason is given, in `src/step/outcome.ts`, so the outcome holds a copy that later changes to what was given do not reach.
- **Not a value.** Event data that is not a value aborts the journey with `not a value`, naming the step and the kind of the event, and the event is not delivered: the emit call ends the step with the executor's signal, as for a reporter that fails. Details that are not a value make the outcome carry the reason without them, and the engine aborts the journey with `not a value` once the attempt ends, in `src/engine/run.ts`, reporting no outcome.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/handles.test.ts`: the step's events with their data captured, and event data that is not a value aborting the journey.
- `tests/unit/step/outcome.test.ts`: details captured when the reason is given, and details that serialise themselves turned into plain data.
- `tests/unit/engine/run.test.ts`: details that are not a value aborting the journey with no outcome reported.

## Done when

Done in stage 6: "A failure whose details are not a value aborts the journey" passes, and 64 is listed in `conformance.json`. Its other scenario, in `0011-events`, runs once 11 is listed in stage 7.
