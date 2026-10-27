# 0058: Workflow policies are built per journey, step policies per attempt

Tech spec for [proposal 0058](https://github.com/itinera-dev/spec/blob/main/proposals/0058-building-policies.md), implemented in [#20](https://github.com/itinera-dev/itinera-ts/issues/20). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0010](0010-hooks-lifecycles-and-roles.md) the policies.

Status: complete, and 58 is listed in `conformance.json`. Stage 4 added `build()` to the policy descriptor, and stage 7 built the policies as the journey runs and listed the proposal.

## When each is built

Both are in `src/engine/policies.ts`, through `PolicyDescriptor.build()`, which makes a new object of the policy's class:

- **Workflow policies**, once per journey, in their order, by `workflowPolicies`, which `src/engine/start.ts` calls, after the instance's initial values are checked and before the dispatcher is made, so no event exists yet. A policy that throws makes `run` reject with a `Refusal` of kind `workflow policy failed`, naming the policy, with the error and its message. A constructor that returns another object than the policy, through a cast, makes it reject with a `Refusal` of kind `unexpected result` (see [0122](0122-unexpected-results.md)).
- **Step policies**, for every attempt, in their order, right after `attempt_started`, before the step is built, by `stepPolicies`, which `src/engine/scan.ts` calls. A policy that throws aborts the journey with `policy could not be built`, naming the step and the policy, with the error and its message. A constructor that returns another object aborts it with `unexpected result`, naming the step and the policy (see [0122](0122-unexpected-results.md)).

So nothing a hook keeps on its policy outlives the attempt or the journey, and a policy attached to two steps, or run by two journeys, shares nothing between them.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/policies.test.ts`: a new step policy for every attempt, a new workflow policy for every journey, each failure while building, and a constructor that returns another object.
- `tests/unit/executor/refusal.test.ts`: the refusal's message.

## Done when

Done in stage 7: every scenario tagged `@proposal-0058` passes, and 58 is listed in `conformance.json`.
