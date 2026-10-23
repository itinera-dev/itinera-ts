# 0049: Custom code that throws

Tech spec for [proposal 0049](https://github.com/itinera-dev/spec/blob/main/proposals/0049-custom-code-that-throws.md), implemented in [#15](https://github.com/itinera-dev/itinera-ts/issues/15). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, decision 6, and [0054](0054-how-custom-code-fails.md) how custom code fails.

Status: complete, and 49 is listed in `conformance.json`. Stage 3 caught what steps and reporters throw, stage 5 what input adapters and constructors throw, and stage 7 what hooks, the role operations they call and policies being built throw, and listed the proposal.

## Where each throw is caught

JavaScript has no failure code can tell apart from a recoverable one, so the engine catches every throw from custom code, and nothing escapes `run` while a journey runs:

- **A step's `run`**: an abnormal termination, in `src/engine/run.ts` (see [0024](0024-abnormal-termination-retriable.md)).
- **A step's constructor**: `step could not be built`, in `src/engine/build.ts`.
- **An input adapter**: `input_adapter_failed`, then the abort, in `src/engine/adapter.ts` (see [0060](0060-input-adapters-attached-to-steps.md)).
- **A hook**, or a role operation it calls, which runs inside it: `hook failed`, naming the step a step hook acts on, with the error and its message, in `src/engine/hook.ts`.
- **A step policy being built**: `policy could not be built`, naming the step and the policy, in `src/engine/policies.ts` (see [0058](0058-building-policies.md)).
- **A workflow policy being built**, before the journey starts: `run` rejects with a `Refusal` of kind `workflow policy failed`, naming the policy, with the error and its message, in `src/engine/policies.ts` and `src/executor/refusal.ts`.
- **A reporter**: `reporter failed`, in `src/engine/journey.ts` (see [0081](0081-reporter-failure-stops-delivery.md)).

When the engine recorded an abort while custom code ran, that abort stands, whatever the code threw afterwards; the journey-abort error thrown back through the code is never taken for its own failure.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/hook.test.ts`: a hook that throws, and an abort recorded while it ran standing.
- `tests/unit/engine/policies.test.ts` and `tests/unit/executor/refusal.test.ts`: a policy that throws while it is built, and the refusal's message.
- The tests of [0024](0024-abnormal-termination-retriable.md), [0060](0060-input-adapters-attached-to-steps.md) and [0081](0081-reporter-failure-stops-delivery.md).

## Done when

Done in stage 7: every scenario tagged `@proposal-0049` passes, and 49 is listed in `conformance.json`.
