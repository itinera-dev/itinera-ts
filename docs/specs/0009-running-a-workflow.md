# 0009: Running a workflow

Tech spec for [proposal 0009](https://github.com/itinera-dev/spec/blob/main/proposals/0009-running-a-workflow.md), implemented in [#5](https://github.com/itinera-dev/itinera-ts/issues/5). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0061](0061-instance-carries-journey-id-and-reporters.md) the instance, [0062](0062-workflow-descriptors.md) the step descriptors, [0012](0012-local-executor.md) the executor and [0065](0065-business-result.md) the result.

Status: in progress. Stage 3 added the scan: steps in their order, each attempted until it succeeds or is given up, with the executor's own decision after an abnormal termination. Stage 5 adds the other outcomes, contributions and the data bag's reads, stage 6 the decisions after a failure and a skip, and stage 7 the hooks around them and lists the proposal.

## The scan

`travel` in `src/engine/scan.ts` runs the journey:

1. It emits `journey_started` with the keys of the initial data.
2. It attempts each step in the order the workflow declares them. An attempt emits `attempt_started`, builds a new step with the descriptor's `build`, and awaits its `run`.
3. An outcome made by the step's helpers emits `step_succeeded`, and the scan goes on to the next step.
4. A throw, a rejection, or anything else `run` returns, is an abnormal termination (see 0024). Since a cast can make `run` return anything, the engine checks the outcome against a `WeakSet` of the outcomes the helpers made, so `{ kind: "success" }` written by hand is not one; the error it carries is a `TypeError` saying what was returned.
5. After each abnormal termination the engine decides by its own rule, in `afterAbnormalTermination` in `src/engine/decision.ts`, a pure function: retry while the step retries abnormal terminations and `attempt.number` is at most the retry budget, otherwise give the step up. Retries are immediate.
6. A step given up fails the journey there, with `journey_failed`; once every step succeeded, `journey_succeeded`. Both say `decidedBy: "default"` until stage 7 adds hooks.

The decisions after an abnormal termination were planned for stage 6, but nothing may escape `run`, so a step that throws needs them as soon as steps run. Stage 6 extends the decision function to failures and skips, and stage 7 calls the hooks around it.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/scan.test.ts`: the events of a journey of one step, steps in order, retries while the budget lasts, giving up with each cause, what `journey_failed` carries, a step returning what is not an outcome, a thrown value that is not an error, a step that cannot be built, an abort raised while a step is built passed on as it was raised, and an abort while a step runs ending the journey whatever the step returned.
- `tests/unit/engine/decision.test.ts`: the decision for each retry budget and setting.
- Later stages: property-based tests with fast-check that attempt counts stay within the budget and that each failed attempt has one decision.

## Done when

Every scenario tagged `@proposal-0009` passes, and 9 is listed in `conformance.json`. Planned for stage 7.
