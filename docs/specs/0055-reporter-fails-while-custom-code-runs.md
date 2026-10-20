# 0055: A reporter that fails while a step or hook runs

Tech spec for [proposal 0055](https://github.com/itinera-dev/spec/blob/main/proposals/0055-reporter-fails-while-custom-code-runs.md), implemented in [#17](https://github.com/itinera-dev/itinera-ts/issues/17). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0081](0081-reporter-failure-stops-delivery.md) the guards.

Status: complete, and 55 is listed in `conformance.json`. Stage 5 made a step's emit calls carry the executor's signal, and stage 7 a hook's, and listed the proposal.

## The executor's signal

A step's step reporter and a hook's hook reporter are made by the same `Handles`, in `src/engine/handles.ts`. When a reporter or the dispatcher fails on an event a call emits, the journey records `reporter failed` and the call's promise rejects with the journey-abort error, `JourneyAbortError`, which the package never exports (see [0008](0008-steps.md)). Every later call rejects the same way and delivers nothing.

Whatever the step or hook does with the rejection, the recorded abort stands: the engine awaits every call before it reads the outcome or the lifecycle, then ends the journey aborted, with no outcome fact for a step, and no `hook_called` and no commit for a hook, in `src/engine/run.ts` and `src/engine/hook.ts`. So what the code did after the failed call counts for nothing.

## Dependencies

None of its own.

## Tests

- `src/engine/handles.test.ts`: the call that fails and every call after it.
- `src/engine/run.test.ts`: a step that catches the signal and goes on.
- `src/engine/hook.test.ts`: a hook that catches the signal and goes on.

## Done when

Done in stage 7: every scenario tagged `@proposal-0055` passes, and 55 is listed in `conformance.json`.
