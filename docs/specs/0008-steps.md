# 0008: Steps

Tech spec for [proposal 0008](https://github.com/itinera-dev/spec/blob/main/proposals/0008-steps.md), implemented in [#4](https://github.com/itinera-dev/itinera-ts/issues/4). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 6 the steps, and [0062](0062-workflow-descriptors.md) the descriptors.

Status: in progress. Stage 3 added the base class `Step`, the outcome of success, `@step` and the step descriptor. Stage 4 adds the requests, stage 5 the other outcomes, contributions and handles, and stage 7 lists the proposal.

## API

Until 0008 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/step.ts`, which becomes the subpath `itinera/step` then, with its submodules in `src/step/`.

- **`Step`** is abstract. Its `run(...requests)` is abstract and public, as the plan's note 6 requires for parameter decorators to type its parameters, returning an `Outcome` or a promise of one, so a step without `run`, or whose `run` returns anything else, does not compile. An application compiling with `noImplicitOverride` writes `override run()`.
- **Only a subclass is a step.** `Step` has the ECMAScript private field `#step`, so a class that only has the same members does not have the type of a step, `StepClass`, which `@step`, `@withStep` and the builder take.
- **`Outcome`** is a discriminated union on `kind`; stage 3 has its one member `Success`, which `this.succeed()`, a protected method of `Step`, returns as one frozen object. `Failure` and `Skipped`, with `this.fail(reason)`, `this.skip()` and `this.skipBecause(reason)`, come in stage 5 with the reasons they capture.
- **`@step()`** records the class in a `WeakSet`, which `@withStep` reads. When the class is defined it throws if the class does not extend `Step` itself, if it is declared twice, or if a parameter of its constructor or of `run` has no request. Until stage 4 adds the request decorators, any parameter has none.
- **`StepDescriptor`** and **`StepOptions`** are in [0062](0062-workflow-descriptors.md). A step's name is checked not to be empty, and its retry budget to be a whole number from 0, when it is declared.
- **`Attempt`** moved to `src/step/attempt.ts`, with `nextAttempt`, which only itinera uses and `src/step.ts` does not re-export.

## Dependencies

None of its own.

## Tests

- `tests/unit/step.test.ts`: the frozen outcome of success.
- `tests/unit/step/declared.test.ts`: what `@step` records and every refusal when a class is defined.
- `tests/unit/step/descriptor.test.ts`: the defaults, the retries given, a new step for every attempt, a frozen descriptor, an empty name and every retry budget that is not a whole number from 0.
- `tests/unit/step/attempt.test.ts`: the attempt, as before.
- `tests/unit/step.test-d.ts`: `Step` is abstract, needs `run`, returns only an outcome or a promise of one, a class that only looks like a step is not one, and `@step` marks only a class extending `Step`.
- `examples/step.ts`, and the steps of every example of a workflow.

## Done when

Every scenario tagged `@proposal-0008` passes, and 8 is listed in `conformance.json`. Planned for stage 7.
