# 0024: Abnormal terminations are retried only when the step allows it

Tech spec for [proposal 0024](https://github.com/itinera-dev/spec/blob/main/proposals/0024-abnormal-termination-retriable.md), implemented in [#9](https://github.com/itinera-dev/itinera-ts/issues/9). [0009](0009-running-a-workflow.md) holds the scan, and [0062](0062-workflow-descriptors.md) the step descriptor's `noRetryOnAbnormalTermination`.

Status: in progress. Stage 3 added the abnormal termination and the executor's decision after it. Hooks around the decision come in stage 7, which lists the proposal.

## What is an abnormal termination

Anything a step's `run` throws, a promise it returns that rejects, or anything it returns that is not an outcome its helpers made, which a cast or `any` lets through. The engine catches every throw, since JavaScript has no failure code can tell apart from a recoverable one. It emits `step_abnormal_termination` with the error's message (see 0083).

The journey-abort error is never one: when the engine recorded an abort while the step ran, it aborts the journey, whatever the step threw or returned afterwards. Stage 3 records aborts only from reporters, before and after a step runs; from stage 5 a step's own emits can record one while it runs (see 0055).

## The decision

`afterAbnormalTermination`, in `src/engine/decision.ts`: retry while `retryOnAbnormalTermination` is on and the retry budget allows another attempt; otherwise give up, with `abnormal termination` when the budget is 0 or the setting is off, and `retries exhausted` when a budget greater than 0 is spent, as chapter 5, 5.6 says.

## Dependencies

None of its own.

## Tests

- `src/engine/decision.test.ts`: the decision for each budget and setting.
- `src/engine/scan.test.ts`: the events of a retried and of a given up step, and an abort while a step runs never taken for an abnormal termination.
- `examples/step-mock.ts`: a step retried after an abnormal termination.

## Done when

Every scenario tagged `@proposal-0024` passes, and 24 is listed in `conformance.json`. Planned for stage 7.
