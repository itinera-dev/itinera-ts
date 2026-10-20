# 0106: The retry budget alone decides retries

Tech spec for [proposal 0106](https://github.com/itinera-dev/spec/blob/main/proposals/0106-retry-budget-alone.md), implemented in [#35](https://github.com/itinera-dev/itinera-ts/issues/35). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0024](0024-abnormal-termination-retriable.md) the abnormal terminations.

Status: complete, and 106 is listed in `conformance.json`. Stage 3 decided retries after an abnormal termination, stage 5 after a failure, and stage 7 called the hooks around the decision and listed the proposal.

## The decision

`afterFailedAttempt`, in `src/engine/decision.ts`, decides from the retry budget alone, and from `retryOnAbnormalTermination` for an abnormal termination: a retry while the budget allows another attempt, otherwise giving up, with the cause `retries exhausted` once a budget greater than 0 is spent. Hooks cannot ask for a retry: `on step retry` runs only once the decision is a retry, and may only keep it or return `FailWorkflow`, which gives the step up at once, in `src/engine/outcome/failed.ts`. The retry cause it receives says what ended the attempt, `failure` or `abnormal termination`.

The step builder's `retryBudget(n)` and `noRetryOnAbnormalTermination()`, and `@withStep`'s options `retryBudget` and `noRetryOnAbnormalTermination`, set both (see [0062](0062-workflow-descriptors.md)).

## Dependencies

None of its own.

## Tests

- `src/engine/decision.test.ts`: the decision for every budget, cause and setting.
- `src/engine/outcome/failed.test.ts`: the retry hook called only before a retry, with its cause, and `FailWorkflow` giving the step up.

## Done when

Done in stage 7: every scenario tagged `@proposal-0106` passes, and 106 is listed in `conformance.json`.
