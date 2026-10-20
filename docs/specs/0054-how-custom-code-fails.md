# 0054: How custom code fails

Tech spec for [proposal 0054](https://github.com/itinera-dev/spec/blob/main/proposals/0054-how-custom-code-fails.md), implemented in [#16](https://github.com/itinera-dev/itinera-ts/issues/16). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, decision 6.

Status: complete, and 54 is listed in `conformance.json`. Stage 3 added the abort reasons and how an error's message is read, stage 4 the rules made impossible to express, and stage 7 the failures of hooks and their proofs, and listed the proposal.

## A recoverable failure

In TypeScript a recoverable failure is a throw, or a promise that rejects; nothing a function returns is a failure. Where custom code fails is in [0049](0049-custom-code-that-throws.md); what the result carries, the error itself and its message, is in [0083](0083-what-failures-carry.md).

## Rules made impossible to express

Chapter 6, 6.5 lets a language refuse at compile time what it can, and the conformance suite excludes the scenarios of each rule so refused, under `impossible` in `conformance.json`, each with the test that proves it. Every proof is a type test in `packages/itinera/tests/proofs.test-d.ts`, one named test each:

- **`invalid-lifecycle`**: a failure hook returning `FinishWorkflow` does not compile, since its decorator and its builder method take only a method returning `OnFailure` (see [0010](0010-hooks-lifecycles-and-roles.md)). The engine still checks what a hook returned, for a cast: `invalid lifecycle`, in `src/engine/hook/lifecycle.ts`.
- **`role-not-provided`**: a policy requesting a role the workflow does not implement does not compile, on a decorated class and through the builder (see [0010](0010-hooks-lifecycles-and-roles.md)).
- **`bag-write`**: an input adapter writing through its access to the data bag does not compile, since `DataBag` has no method that writes, as the plan's section on rules made impossible decides (see [0091](0091-adapters-read-the-data-bag.md)). Setting a property of the access through `Reflect.set` or a cast still changes nothing the data bag holds, which the runner's own tests check.

The scenarios of `late-handle` and `non-value` run, since types cannot stop a step from keeping a handle, or a cast from passing what is not a value.

## Dependencies

None of its own.

## Tests

- `tests/proofs.test-d.ts`: the proofs.
- `src/engine/hook/lifecycle.test.ts`: every lifecycle a hook may not return, through a cast.

## Done when

Done in stage 7: every scenario tagged `@proposal-0054` passes, but those excluded with their proofs, and 54 is listed in `conformance.json`.
