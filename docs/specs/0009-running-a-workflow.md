# 0009: Running a workflow

Tech spec for [proposal 0009](https://github.com/itinera-dev/spec/blob/main/proposals/0009-running-a-workflow.md), implemented in [#5](https://github.com/itinera-dev/itinera-ts/issues/5). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0061](0061-instance-carries-journey-id-and-reporters.md) the instance, [0062](0062-workflow-descriptors.md) the step descriptors, [0012](0012-local-executor.md) the executor and [0065](0065-business-result.md) the result.

Status: in progress. Stage 3 added the scan: steps in their order, each attempted until it succeeds or is given up, with the executor's own decision after an abnormal termination. Stage 5 added the data bag's reads, then the other outcomes, contributions and the decision after a failure; stage 6 adds the statuses, aborts and `output`, and stage 7 the hooks around the decisions and lists the proposal.

## The scan

`travel` in `src/engine/scan.ts` runs the journey:

1. It emits `journey_started` with the keys of the initial data.
2. It attempts each step in the order the workflow declares them. An attempt emits `attempt_started`, builds a new step, in `src/engine/build.ts`, runs it, lending its `run` the handles it requests, in `src/engine/run.ts`, and concludes from what it ended with, in `src/engine/outcome.ts` (see [0008](0008-steps.md)).
3. A success emits `step_succeeded`, commits the attempt's contributions, and the scan goes on to the next step. A skip emits `step_skipped`, discards them, and goes on too.
4. A throw, a rejection, or anything else `run` returns, is an abnormal termination (see 0024). Since a cast can make `run` return anything, the engine checks the outcome against a `WeakSet` of the outcomes the helpers made, so `{ kind: "success" }` written by hand is not one; the error it carries is a `TypeError` saying what was returned. A failure emits `step_failed` with its reason.
5. After each failure and each abnormal termination the engine decides by its own rule, in `afterFailedAttempt` in `src/engine/decision.ts`, a pure function: retry while `attempt.number` is at most the retry budget, unless the attempt ended abnormally and the step does not retry abnormal terminations, otherwise give the step up, with the attempt's own cause for a step that could not retry it and `retries exhausted` once the budget is spent. Retries are immediate.
6. A step given up fails the journey there, with `journey_failed`, carrying the last attempt's reason after a failure and its error's message after an abnormal termination; once every step succeeded or was skipped, `journey_succeeded`. Both say `decidedBy: "default"` until stage 7 adds hooks.

The decisions after an abnormal termination and after a failure were planned for stage 6, but nothing may escape `run`, so a step that throws needs them as soon as steps run, and a step that fails as soon as it can fail. Stage 7 calls the hooks around them.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/scan.test.ts`: the events of a journey of one step, steps in order, what `journey_failed` carries, a step that cannot be built, and an abort raised while a step is built passed on as it was raised.
- `tests/unit/engine/run.test.ts` and `tests/unit/engine/outcome.test.ts`: a step returning what is not an outcome, a thrown value that is not an error, an abort while a step runs ending the journey whatever the step returned, what follows each outcome, retries while the budget lasts and giving up with each cause.
- `tests/unit/engine/decision.test.ts`: the decision for each retry budget, cause and setting.
- Later stages: property-based tests with fast-check that attempt counts stay within the budget and that each failed attempt has one decision.

## Done when

Every scenario tagged `@proposal-0009` passes, and 9 is listed in `conformance.json`. Planned for stage 7.
