# 0061: The workflow instance carries its journey ID and its reporters

Tech spec for [proposal 0061](https://github.com/itinera-dev/spec/blob/main/proposals/0061-instance-carries-journey-id-and-reporters.md), implemented in [#22](https://github.com/itinera-dev/itinera-ts/issues/22). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 9 the instance, and [0062](0062-workflow-descriptors.md) the descriptors and `build()`.

Status: in progress. Stage 3 added `WorkflowInstance` and `instance()`. The executor that runs an instance comes next in stage 3, `@dataBag()` for the ID generator in stage 4, and stage 6 lists the proposal.

## API

Until 0061 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/instance.ts`, which becomes the subpath `itinera/instance` then, and `instance()` in `src/workflow.ts`.

- **`orders.instance(initialData, { reporters, reportersGlobalMetadata })`**, on a workflow object `build()` made, makes the instance in the order of chapter 5, 5.1: the initial data, then the journey ID from the descriptor's `generateJourneyId`, given the workflow object and the initial data, then the reporters: a new one of each class the workflow lists, from the descriptor's `reporters()`, followed by the instance's own.
- **`ValuesByKey`**: initial data and initial global metadata are each a `Map`, entries, or a plain object whose properties set to `undefined` are left out. They are copied into a new `Map` when the instance is made, so changing what was given changes nothing in the instance, and a key given twice keeps its last value. The values are checked by `run`, which refuses what is not a value, as chapter 3, 3.7 says.
- **Reporters** are each a reporter, or a function taking the journey ID and returning one, called once the ID is made. They come after those the workflow lists, which are made for each instance while it is created, so no reporter's constructor runs once the executor has the instance. `takeReporters()` hands over both, the workflow's first.
- **`WorkflowInstance<W>`**: `descriptor`, `workflow`, `initialData`, `journeyId`, `takeReporters()` and `takeGlobalMetadata()`, the last two handing their contents over once and empty afterwards. An instance written by hand implements the same interface.
- **A failure while the instance is made**, an ID generator or a function making a reporter that throws, escapes `instance()` as the throw, before the executor is involved, as chapter 5, 5.1 point 1 leaves it. This was the open point of #22, taken as its natural reading.

## Dependencies

None of its own. The random UUID is the platform's `crypto.randomUUID()`, which a browser offers only in a secure context.

## Tests

- `src/instance.test.ts`: the ID from the ID generator, a reporter function given the ID, the workflow's reporters before the instance's own, new reporters for each instance, reporters and global metadata handed over once, initial data in the order given as a `Map` or entries, properties set to `undefined` left out, the last value of a key given twice, and a copy of the `Map` given.
- `src/workflow.test.ts`: the workflow object beside its descriptor, and an object made with `new` refused.
- `examples/instance.ts`.

## Done when

Every scenario tagged `@proposal-0061` passes, and 61 is listed in `conformance.json`. Planned for stage 6.
