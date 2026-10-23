# 0057: Contributors and step reporters are valid only during their attempt or hook

Tech spec for [proposal 0057](https://github.com/itinera-dev/spec/blob/main/proposals/0057-handles-valid-during-their-attempt.md), implemented in [#19](https://github.com/itinera-dev/itinera-ts/issues/19). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0008](0008-steps.md) the handles.

Status: complete, and 57 is listed in `conformance.json`. Stage 5 closed a step's handles when its attempt ends, and stage 7 a hook's when it returns, and listed the proposal.

## Closing the handles

`Handles`, in `src/engine/handles.ts`, makes the contributor and the reporter of one holder: an attempt of a step, a step hook or a workflow hook, described in `src/engine/handles/holder.ts`, which also says what the events they emit carry, which source a contribution or an entry of global metadata records, and whom an abort names. Once the holder's code and every call it made have settled, `closed()` closes them for good: a call then throws an `Error` at once, saying which handle of which holder was used, and records, delivers and sets nothing, as chapter 4, 4.6 point 7 says.

Types cannot stop custom code from keeping a handle, so the `@late-handle` scenarios run.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/handles.test.ts`: closed handles throwing and changing nothing, for every kind of holder.

## Done when

Done in stage 7: every scenario tagged `@proposal-0057` passes, and 57 is listed in `conformance.json`.
