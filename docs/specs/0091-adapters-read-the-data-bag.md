# 0091: Input adapters read the data bag

Tech spec for [proposal 0091](https://github.com/itinera-dev/spec/blob/main/proposals/0091-adapters-read-the-data-bag.md), implemented in [#30](https://github.com/itinera-dev/itinera-ts/issues/30). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 8 the input adapters, and [0060](0060-input-adapters-attached-to-steps.md) the adapters.

Status: in progress. Stage 4 has added `@dataBag()`. Stage 5 gives an adapter read access to the data bag while it is called, and the reads the data bag lacks so far, and stage 7 lists the proposal.

## API

Until 0091 is listed, `@dataBag()` is exported only from `itinera/unstable`. It is defined in `src/journey/request.ts` and re-exported by `src/journey.ts`, which becomes the subpath `itinera/journey`.

- **`@dataBag()`** marks a parameter of an input adapter with a request for the data bag, typed `DataBag`. It compiles only on a method of a class extending `Workflow`, on a parameter whose type accepts a `DataBag`, and `@inputAdapter` accepts it. `DataBag` has no method that writes, so an adapter cannot change it through its type; stage 5 makes the access it is given show nothing once its call has returned.

## Dependencies

None of its own.

## Tests

- `tests/unit/journey/request.test.ts`: what `@dataBag` records.
- `tests/unit/workflow/adapter.test-d.ts`: `@dataBag` on a parameter of another type or outside a workflow.
- `examples/input-adapter.ts`.

## Done when

Every scenario tagged `@proposal-0091` passes, and 91 is listed in `conformance.json`. Planned for stage 7.
