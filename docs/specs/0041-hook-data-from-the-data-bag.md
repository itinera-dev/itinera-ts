# 0041: Hooks read data from the data bag

Tech spec for [proposal 0041](https://github.com/itinera-dev/spec/blob/main/proposals/0041-hook-data-from-the-data-bag.md), implemented in [#13](https://github.com/itinera-dev/itinera-ts/issues/13). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0010](0010-hooks-lifecycles-and-roles.md) the hooks.

Status: complete, and 41 is listed in `conformance.json`. Stage 4 has added `@fromWorkflow` in hooks. Its later layers let input adapters and providers request it too, and stage 7 read it from the data bag when a hook is called, in `src/engine/hook/answer.ts`, and listed the proposal.

## API

0041 is listed, but it stays exported only from `itinera/unstable` while it names API of proposals not yet listed, such as the rescue steps of [0003](0003-rescue-steps.md), as the agents' manual says. It is defined in `src/workflow/request.ts` and re-exported by `src/workflow.ts`, which becomes the subpath `itinera/workflow`.

- **`@fromWorkflow(key, type?)`** marks a parameter of a hook with a request for data from the workflow, read from the data bag under the key, never through an input adapter. It is typed like `@input`: required unless its type is wrapped in `optional`, its type written as a token or any other Standard Schema validator, or read from the metadata. It compiles only in a method of either kind of policy, on a parameter whose type accepts what it gives, and records the key and the type in the table of requests.

## Dependencies

None of its own.

## Tests

- `tests/unit/workflow/request.test.ts`: the key and a type written, optional or read from the metadata.
- `tests/unit/workflow/request.test-d.ts`: either kind of policy, an optional value on a parameter that is not an `Option`, and a step.
- `examples/policy.ts`.

## Done when

Done in stage 7: every scenario tagged `@proposal-0041` passes, but those that also name a proposal not yet listed, and 41 is listed in `conformance.json`.
