# 0083: What a failure, an abort and a refusal carry

Tech spec for [proposal 0083](https://github.com/itinera-dev/spec/blob/main/proposals/0083-what-failures-carry.md), implemented in [#28](https://github.com/itinera-dev/itinera-ts/issues/28). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, decisions 6 and 8, and [0065](0065-business-result.md) the result.

Status: complete, and 83 is listed in `conformance.json`. Stage 3 added the failure and the abort of the result, the refusal and how an error's message is read. Stage 7 answered hooks requesting `@failureReason()`, `@error()` and `@failureCause()`, and listed the proposal.

## API

0083 is listed, but it stays exported only from `itinera/unstable` while it names API of proposals not yet listed, such as the rescue steps of [0003](0003-rescue-steps.md), as the agents' manual says.

- **`Failure`**, in `src/journey/failure.ts`, is `FailureWithReason | FailureWithError`. A failure explained by a reason has `cause` (`failure`, `retries exhausted` or `FailWorkflow`) and `reason`; one explained by an error has `cause` (`abnormal termination` or `retries exhausted`), `error`, the thrown value itself, and `errorMessage`. Each says `never` for the other's fields, so no failure carries both, as chapter 5, 5.8's table requires.
- **`Abort`**, in `src/journey/abort.ts`, is every abort `journey_aborted` carries, with `error` added exactly where the event carries `errorMessage`: required where the message is, optional where the message is. `journey_aborted` carries the abort without `error`, since events carry an error only as its message.
- **`Refusal`** carries `error` and `errorMessage` on the kinds of `refused` that failing custom code caused, and the same error as its standard `cause`, the option of `Error` made for this. These were the open names of #28.

## What hooks receive

`@failureReason()` is answered with a copy of the reason the attempt's outcome carries, and `@error()` with its own copy of what the attempt threw, keeping its prototype and its properties (see [0027](0027-received-data-read-only.md)), in `src/engine/hook/answer.ts`, while the result carries the error as it was thrown. When the attempt reported none, a required request aborts the journey with `required data missing`, naming the step and the hook, and an optional one is `None`. `@failureCause()` and `@retryCause()` give why the hook was called. A hook that fails its journey with `FailWorkflow` gives the result a failure with the cause `FailWorkflow` and the hook's reason.

## How an error's message is read

`messageOf(thrown)`, in `src/engine/message.ts`: `message` for an `Error`, and `String(thrown)` otherwise, itself passed through `String` in case a `message` getter returns something else. Reading either may throw, as a getter that throws or an object with no prototype does, so the fixed text `an error whose message could not be read` stands in then, since nothing may escape `run`.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/scan.test.ts` and `tests/unit/engine.test.ts`: the error as thrown and its message, in the result and on the events, and the text of a thrown value that is not an error.
- `tests/unit/engine/journey.test.ts`: `journey_aborted` without the error.
- `tests/unit/executor/refusal.test.ts`: the standard `cause`.
- `tests/unit/journey.test-d.ts`: the error present on an abort exactly as its message is, and no failure with both a reason and an error.

## Done when

Done in stage 7: every scenario tagged `@proposal-0083` passes, but those that also name a proposal not yet listed, and 83 is listed in `conformance.json`.
