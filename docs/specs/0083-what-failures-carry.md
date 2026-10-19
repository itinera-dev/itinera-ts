# 0083: What a failure, an abort and a refusal carry

Tech spec for [proposal 0083](https://github.com/itinera-dev/spec/blob/main/proposals/0083-what-failures-carry.md), implemented in [#28](https://github.com/itinera-dev/itinera-ts/issues/28). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, decisions 6 and 8, and [0065](0065-business-result.md) the result.

Status: in progress. Stage 3 added the failure and the abort of the result, the refusal and how an error's message is read. Hooks requesting `@failureReason()`, `@error()` and `@failureCause()` come in stage 7, which lists the proposal.

## API

Until 0083 is listed, everything here is exported only from `itinera/unstable`.

- **`Failure`**, in `src/journey/failure.ts`, is `FailureWithReason | FailureWithError`. A failure explained by a reason has `cause` (`failure`, `retries exhausted` or `FailWorkflow`) and `reason`; one explained by an error has `cause` (`abnormal termination` or `retries exhausted`), `error`, the thrown value itself, and `errorMessage`. Each says `never` for the other's fields, so no failure carries both, as chapter 5, 5.8's table requires.
- **`Abort`**, in `src/journey/abort.ts`, is every abort `journey_aborted` carries, with `error` added exactly where the event carries `errorMessage`: required where the message is, optional where the message is. `journey_aborted` carries the abort without `error`, since events carry an error only as its message.
- **`Refusal`** carries `error` and `errorMessage` on the kinds of `refused` that failing custom code caused, and the same error as its standard `cause`, the option of `Error` made for this. These were the open names of #28.

## How an error's message is read

`messageOf(thrown)`, in `src/engine/message.ts`: `message` for an `Error`, and `String(thrown)` otherwise, itself passed through `String` in case a `message` getter returns something else. Reading either may throw, as a getter that throws or an object with no prototype does, so the fixed text `an error whose message could not be read` stands in then, since nothing may escape `run`.

## Dependencies

None of its own.

## Tests

- `src/engine/scan.test.ts` and `src/engine.test.ts`: the error as thrown and its message, in the result and on the events, and the text of a thrown value that is not an error.
- `src/engine/journey.test.ts`: `journey_aborted` without the error.
- `src/executor/refusal.test.ts`: the standard `cause`.
- `src/journey.test-d.ts`: the error present on an abort exactly as its message is, and no failure with both a reason and an error.

## Done when

Every scenario tagged `@proposal-0083` passes, and 83 is listed in `conformance.json`. Planned for stage 7.
