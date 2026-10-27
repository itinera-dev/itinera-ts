# 0024: Abnormal terminations are retried only when the step allows it

Tech spec for [proposal 0024](https://github.com/itinera-dev/spec/blob/main/proposals/0024-abnormal-termination-retriable.md), implemented in [#9](https://github.com/itinera-dev/itinera-ts/issues/9). [0009](0009-running-a-workflow.md) holds the scan, and [0062](0062-workflow-descriptors.md) the step descriptor's `noRetryOnAbnormalTermination`.

Status: complete, and 24 is listed in `conformance.json`. Stage 3 added the abnormal termination and the executor's decision after it. Stage 7 added the hooks around the decision, and listed the proposal.

## What is an abnormal termination

Anything a step's `run` throws, or a promise it returns that rejects. What it returns that is not an outcome its helpers made, which only a cast or `any` lets through, is not an abnormal termination but an unexpected result, which aborts the journey (see [0122](0122-unexpected-results.md)). The engine catches every throw, since JavaScript has no failure code can tell apart from a recoverable one. It emits `step_abnormal_termination` with the error's message (see 0083).

The journey-abort error is never one: when the engine recorded an abort while the step ran, it aborts the journey, whatever the step threw or returned afterwards. Stage 3 recorded aborts only from reporters, before and after a step runs; from stage 5 a step's own calls on its handles record one while it runs (see [0008](0008-steps.md)).

## The decision

`afterFailedAttempt`, in `src/engine/decision.ts`, given the cause `abnormal termination`: retry while `retryOnAbnormalTermination` is on and the retry budget allows another attempt; otherwise give up, with `abnormal termination` when the budget is 0 or the setting is off, and `retries exhausted` when a budget greater than 0 is spent, as chapter 5, 5.6 says. Stage 5 made it decide after a failure too (see [0008](0008-steps.md)). An abnormal termination commits nothing the attempt contributed.

## The hook

Right after `step_abnormal_termination`, `on step abnormal termination` runs, in `terminated` in `src/engine/outcome.ts`, given no contributions, since an abnormal termination carries none, and the error through `@error()`. `FailWorkflow` gives the step up at once, decided by the hook; otherwise the decision follows, and the retry or failure hook after it (see [0009](0009-running-a-workflow.md)).

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/decision.test.ts`: the decision for each budget and setting.
- `tests/unit/engine/outcome.test.ts`: the events of a retried and of a given up step, and nothing committed.
- `tests/unit/engine/run.test.ts`: an abort while a step runs never taken for an abnormal termination.
- `examples/step-mock.ts`: a step retried after an abnormal termination.

## Done when

Done in stage 7: every scenario tagged `@proposal-0024` passes, but those that also name a proposal not yet listed, and 24 is listed in `conformance.json`.
