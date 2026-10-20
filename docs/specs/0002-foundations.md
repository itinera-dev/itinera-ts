# 0002: Foundations

Tech spec for [proposal 0002](https://github.com/itinera-dev/spec/blob/main/proposals/0002-foundations.md), implemented in [#2](https://github.com/itinera-dev/itinera-ts/issues/2). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals. 0002 introduces workflows, steps, policies, input adapters and the data bag; each later proposal refines one of them, so most of what implements 0002 is described in the tech spec of the proposal that refines it.

Status: complete, and 2 is listed in `conformance.json`. Stage 3 ran a workflow of steps in order, stage 4 declared steps, policies and input adapters, with the violations and the listing, stage 5 built steps from the data bag and their adapters, and stage 7 called the hooks and listed the proposal.

## Where each part lives

- **Workflows and their listing**: [0062](0062-workflow-descriptors.md), in `src/workflow.ts` and `src/workflow/`.
- **Steps, their outcomes and contributions**: [0008](0008-steps.md), in `src/step.ts` and `src/step/`; the scan that runs them, [0009](0009-running-a-workflow.md), in `src/engine/scan.ts`.
- **Policies and hooks**: [0010](0010-hooks-lifecycles-and-roles.md), in `src/policy.ts` and `src/policy/`; calling them, in `src/engine/hook.ts` and `src/engine/hook/`, below.
- **Input adapters**: [0060](0060-input-adapters-attached-to-steps.md), in `src/workflow/adapter.ts`, and building a step, in `src/engine/build.ts`.
- **The data bag**: [0056](0056-data-bag-values.md) and [0091](0091-adapters-read-the-data-bag.md), in `src/journey/data-bag.ts`.

## Calling a hook

`hookCalled`, in `src/engine/hook.ts`, calls one hook of one built policy, for a step hook through `stepHookCalled` in `src/engine/hook/step.ts`, for a workflow hook through `workflowHookCalled` in `src/engine/hook/workflow.ts`:

1. It lends the hook handles of its own, a contributor and a hook reporter, made by `Handles` in `src/engine/handles.ts` for the hook as their holder, in `src/engine/handles/holder.ts`.
2. It answers the hook's requests in the order they were declared, in `src/engine/hook/answer.ts` (see [0041](0041-hook-data-from-the-data-bag.md), [0083](0083-what-failures-carry.md) and spec#92 for the order). A request a hook of its kind is never answered, such as `@stepName()` on a workflow hook, which only a cast lets through, aborts the journey with `hook failed` and a `TypeError` saying which request it is.
3. It calls the hook's method through the policy descriptor's `call(policy, hook, answers)`, in `src/policy/descriptor.ts`, and awaits it and every call it made on its handles, then closes the handles (see [0057](0057-handles-valid-during-their-attempt.md)).
4. It checks what the hook returned, in `src/engine/hook/lifecycle.ts` (see [0010](0010-hooks-lifecycles-and-roles.md)), emits `hook_called`, with the lifecycle a step hook returned, and commits what the hook contributed, each emitting `contribution_committed` with the hook as its source, in `src/engine/commit.ts`.

A step hook sees what the attempt contributed, a failed attempt's included, through `@fromStep`; nothing a failed attempt contributed is committed.

The listing, a hook defined twice and every other violation are in [0062](0062-workflow-descriptors.md) and [0010](0010-hooks-lifecycles-and-roles.md).

## Dependencies

None of its own.

## Tests

- `src/engine/hook.test.ts` and `src/engine/hook/answer.test.ts`: requests answered in order, a request a hook is never answered, `hook_called`, and the hook's contributions committed after it.
- The tests of each proposal named above.
- `examples/policy-mock.ts`, and every example of a workflow.

## Done when

Done in stage 7: every scenario tagged `@proposal-0002` passes, but those that also name a proposal not yet listed, and 2 is listed in `conformance.json`.
