# 0091: Input adapters read the data bag

Tech spec for [proposal 0091](https://github.com/itinera-dev/spec/blob/main/proposals/0091-adapters-read-the-data-bag.md), implemented in [#30](https://github.com/itinera-dev/itinera-ts/issues/30). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 8 the input adapters, and [0060](0060-input-adapters-attached-to-steps.md) the adapters.

Status: complete, and 91 is listed in `conformance.json`. Stage 4 has added `@dataBag()`. Stage 5 has given an adapter read access to the data bag while it is called, and the data bag its typed read, and stage 7 listed the proposal.

## API

0091 is listed, but it stays exported only from `itinera/unstable` while it names API of proposals not yet listed, such as the services of [0095](0095-services-provided-to-steps.md), the rescue steps of [0003](0003-rescue-steps.md) and the global metadata of [0102](0102-global-metadata.md), as the agents' manual says. It is defined in `src/journey/request.ts` and re-exported by `src/journey.ts`, which becomes the subpath `itinera/journey`.

- **`@dataBag()`** marks a parameter of an input adapter or of the ID generator with a request for the data bag, typed `DataBag`. It compiles only on a method of a class extending `Workflow`, on a parameter whose type accepts a `DataBag`, and `@inputAdapter` accepts it, as `@idGenerator` does (see [0062](0062-workflow-descriptors.md)). `DataBag` has no method that writes, so an adapter cannot change it through its type, and the scenario tagged `bag-write` is excluded under `impossible`, with its proof in `packages/itinera/tests/proofs.test-d.ts` (see [0054](0054-how-custom-code-fails.md)); the access it is given shows nothing once its call has returned or its promise has settled, as chapter 4, 4.2 point 8 says: no key, and every read absent.
- **`DataBag.read(key, type)`**, in `src/journey/data-bag.ts`, gives a `Read`, from `src/journey/read.ts`: `Present` with the requester's own copy of the value, `Absent` when the key has none, or `OtherType` when the schema refuses it, as `received` does (see [0056](0056-data-bag-values.md)). Each has `option()`, which gives `Some` of the value only when it is present. `type` is any Standard Schema validator, or one wrapped in `optional`, as the plan's section 3 allows a typed read: then the key never reads absent, but present, holding `None` when it has no value and `Some` of a value of the type. That a missing key reads present rather than absent is a default for the maintainer to confirm, recorded in the plan's Points to watch. Until 0091 is listed, `Read` and its members are exported only from `itinera/unstable`, as the data bag's other API is.

## Dependencies

None of its own.

## Tests

- `tests/unit/journey/request.test.ts`: what `@dataBag` records.
- `tests/unit/workflow/adapter.test-d.ts`: `@dataBag` on a parameter of another type or outside a workflow.
- `tests/unit/journey/data-bag.test.ts`, `tests/unit/journey/data-bag.test-d.ts` and `tests/unit/journey/read.test.ts`: each kind of read, the requester's own copy, what a read is typed as, and the access closed.
- `tests/unit/engine/adapter.test.ts`: reads through the access while the adapter is called, and nothing through an access kept after.
- `examples/input-adapter.ts` and `examples/data-bag.ts`.

## Done when

Done in stage 7: every scenario tagged `@proposal-0091` passes, but those that also name a proposal not yet listed, and 91 is listed in `conformance.json`.
