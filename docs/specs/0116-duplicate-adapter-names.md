# 0116: Duplicate adapter names, and a step named twice in one list

Tech spec for [proposal 0116](https://github.com/itinera-dev/spec/blob/main/proposals/0116-duplicate-adapter-names.md), implemented in [#73](https://github.com/itinera-dev/itinera-ts/issues/73). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0060](0060-input-adapters-attached-to-steps.md) the input adapters and [0095](0095-services-provided-to-steps.md) the service providers.

Status: complete, and 116 is listed in `conformance.json`. Stage 4 reported these violations ahead of the proposal, as the maintainer decided, and the layer that moved the cases to `v0.1.0-rc.16` listed it.

## The violations

`violationsOf` finds them when a workflow is built, as every violation of chapter 3, 3.6 is found (see [0062](0062-workflow-descriptors.md)), so `@workflow` throws `Violations` when the class is defined and the builder's `build()` before the constructor runs.

- **`duplicate adapter name`**, `DuplicateAdapterName` in `src/workflow/violation/adapters.ts`: the name two or more input adapters share, once per name, whatever steps they are attached to. Only input adapters are counted, so an adapter and a service provider may share a name.
- **One adapter listing a step twice** is `step adapted twice`, in the same module: every attachment to a step counts, so the adapter is named once for each time its list names the step, a rescue step's name `<step name>_rescue` included.
- **One provider listing a step twice** is `service provided twice`, in `src/workflow/violation/providers.ts`, naming the provider once for each time its list names the step, a rescue step's name included.

## Dependencies

None of its own.

## Tests

- `tests/unit/workflow/violation/adapters.test.ts`: `duplicateAdapterNames` names each name more than one adapter has, once, and `stepsAdaptedTwice` names a step that one adapter lists twice.
- `tests/unit/workflow/violation/providers.test.ts`: `providerViolations` names a step that one provider lists twice.
- `tests/unit/workflow/violation.test.ts`: each violation's line in the message of `Violations`.
- The conformance cases tagged `@proposal-0116`.

## Done when

Every scenario tagged `@proposal-0116` passes, and 116 is listed in `conformance.json`.
