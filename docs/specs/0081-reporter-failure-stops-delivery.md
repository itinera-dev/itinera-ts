# 0081: A reporter that fails stops the delivery of the event it failed on

Tech spec for [proposal 0081](https://github.com/itinera-dev/spec/blob/main/proposals/0081-reporter-failure-stops-delivery.md), implemented in [#27](https://github.com/itinera-dev/itinera-ts/issues/27). [0011](0011-events.md) holds reporters and [0063](0063-dispatcher-factory.md) dispatchers, and [architecture.md](../architecture.md) draws how an event reaches the reporters.

Status: in progress. Stage 3 added the guards and the abort when a reporter fails. Events emitted by steps and hooks come in stages 5 and 7, which lists the proposal.

## The guards

`Guard`, in `src/engine/guard.ts`, wraps each reporter the engine adds to the journey's dispatcher, so the rules of chapter 2, 2.3 hold whatever the dispatcher does:

- **The first failure stands.** All the guards of a journey share one `Failures`, which keeps the first error any reporter threw. A guard passes its reporter's failure on after recording it.
- **Only `journey_aborted` once a reporter failed**, and never to a reporter that failed. A failure on `journey_aborted` is ignored, so delivery goes on to the reporters after it.
- **Global metadata** goes through the same guards, before the journey starts, where a failure is a refusal instead (see 0012).

## The abort

`Journey.emit`, in `src/engine/journey.ts`, makes each event and dispatches it. When the dispatcher throws, or a guard recorded a new failure the dispatcher swallowed, it records the abort `reporter failed`, naming the step being run, if any, with the first failure's error and message, and throws the journey-abort error. Only `runJourney` catches it, and delivers `journey_aborted`, ignoring whatever fails then.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/guard.test.ts`: every rule of the guards.
- `tests/unit/engine/journey.test.ts`: the abort when a reporter fails, when the dispatcher fails and when it swallows a failure, the first abort standing, and `journey_aborted` delivered whatever fails.
- `tests/unit/engine.test.ts`: `journey_aborted` reaching the other reporters only, and a failure on the last event.

## Done when

Every scenario tagged `@proposal-0081` passes, and 81 is listed in `conformance.json`. Planned for stage 7.
