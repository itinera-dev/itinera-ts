# 0009: Running a workflow

Tech spec for [proposal 0009](https://github.com/itinera-dev/spec/blob/main/proposals/0009-running-a-workflow.md), implemented in [#5](https://github.com/itinera-dev/itinera-ts/issues/5). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0061](0061-instance-carries-journey-id-and-reporters.md) the instance, [0062](0062-workflow-descriptors.md) the step descriptors, [0012](0012-local-executor.md) the executor and [0065](0065-business-result.md) the result.

Status: complete, and 9 is listed in `conformance.json`. Stage 3 added the scan: steps in their order, each attempted until it succeeds or is given up, with the executor's own decision after an abnormal termination. Stage 5 added the data bag's reads, then the other outcomes, contributions and the decision after a failure; stage 6 added the property-based tests of the scan and the result's `output`, and stage 7 the hooks around the decisions, and listed the proposal.

## The scan

`travel` in `src/engine/scan.ts` runs the journey:

1. It emits `journey_started` with the keys of the initial data.
2. It attempts each step in the order the workflow declares them. An attempt emits `attempt_started`, builds a new step, in `src/engine/build.ts`, runs it, lending its `run` the handles it requests, in `src/engine/run.ts`, and concludes from what it ended with, in `src/engine/outcome.ts` (see [0008](0008-steps.md)).
3. A success emits `step_succeeded`, commits the attempt's contributions, and the scan goes on to the next step. A skip emits `step_skipped`, discards them, and goes on too.
4. A throw, a rejection, or anything else `run` returns, is an abnormal termination (see 0024). Since a cast can make `run` return anything, the engine checks the outcome against a `WeakSet` of the outcomes the helpers made, so `{ kind: "success" }` written by hand is not one; the error it carries is a `TypeError` saying what was returned. A failure emits `step_failed` with its reason.
5. After each failure and each abnormal termination the engine decides by its own rule, in `afterFailedAttempt` in `src/engine/decision.ts`, a pure function: retry while `attempt.number` is at most the retry budget, unless the attempt ended abnormally and the step does not retry abnormal terminations, otherwise give the step up, with the attempt's own cause for a step that could not retry it and `retries exhausted` once the budget is spent. Retries are immediate.
6. A step given up fails the journey there, with `journey_failed`, carrying the last attempt's reason after a failure and its error's message after an abnormal termination; once every step succeeded or was skipped, `journey_succeeded`. Both say `decidedBy: "default"` unless a hook decided, as below.

The decisions after an abnormal termination and after a failure were planned for stage 6, but nothing may escape `run`, so a step that throws needs them as soon as steps run, and a step that fails as soon as it can fail.

## Hooks around the decisions

Stage 7 calls the hooks of the step's policies, built for the attempt, and of the workflow's, built for the journey (see [0058](0058-building-policies.md)), in the order of chapter 6, 6.2, each through `hookCalled` (see [0002](0002-foundations.md)). Since no two policies of a step, or of the workflow, define the same hook (`hook defined twice`), each hook is called on the one policy that defines it, by `stepHookCalled` in `src/engine/hook/step.ts`, or not at all:

1. **After a success**, `on step success`, in `succeeded` in `src/engine/outcome.ts`, then the contributions are committed. `FinishWorkflow` ends the journey there, succeeded and decided by the hook; `FailWorkflow` fails it there, decided by the hook, and the step stays succeeded.
2. **After an abnormal termination**, `step_abnormal_termination`, then `on step abnormal termination`, given no contributions, in `terminated`. `FailWorkflow` gives the step up at once, with `step_given_up` decided by the hook; otherwise the decision follows.
3. **Before a retry**, `on step retry`, in `decided` in `src/engine/outcome/failed.ts`, with the retry cause, then `step_retrying`, unless the hook returned `FailWorkflow`, which gives the step up at once without `on step failure`.
4. **Once given up**, `step_given_up` by default, then `on step failure`, with the failure cause; `FailWorkflow` fails the journey decided by the hook, with its reason.
5. **At the end**, `on workflow success` or `on workflow failure`, in `src/engine/scan.ts`, before `journey_succeeded` or `journey_failed`. No hook runs after an abort.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/scan.test.ts`: the events of a journey of one step, steps in order, what `journey_failed` carries, a step that cannot be built, and an abort raised while a step is built passed on as it was raised.
- `tests/unit/engine/run.test.ts` and `tests/unit/engine/outcome.test.ts`: a step returning what is not an outcome, a thrown value that is not an error, an abort while a step runs ending the journey whatever the step returned, what follows each outcome, retries while the budget lasts and giving up with each cause.
- `tests/unit/engine/decision.test.ts`: the decision for each retry budget, cause and setting.
- `tests/unit/engine/outcome.test.ts`, `tests/unit/engine/outcome/failed.test.ts` and `tests/unit/engine/scan.test.ts`: every hook in its place, and every lifecycle it may return there.
- `tests/unit/engine/scan.test.ts`, with fast-check, over generated workflows of steps whose attempts succeed, fail, skip or end abnormally, with any retry budget: the journey starts with `journey_started` and ends with `journey_succeeded` or `journey_failed`, sequence numbers count from 1 with no gap, each attempt has exactly one outcome fact and each failed attempt exactly one decision, no step is attempted more often than its budget allows, and steps are attempted in their order up to the one given up; and over generated data, no engine event carries a value of the data bag.

## Done when

Done in stage 7: every scenario tagged `@proposal-0009` passes, but those that also name a proposal not yet listed, and 9 is listed in `conformance.json`.
