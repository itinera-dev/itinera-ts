# 0008: Steps

Tech spec for [proposal 0008](https://github.com/itinera-dev/spec/blob/main/proposals/0008-steps.md), implemented in [#4](https://github.com/itinera-dev/itinera-ts/issues/4). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 6 the steps, and [0062](0062-workflow-descriptors.md) the descriptors.

Status: in progress. Stage 3 added the base class `Step`, the outcome of success, `@step` and the step descriptor. Stage 4 adds the requests, and its first layer has added those of a step's constructor and `run`; stage 5 the other outcomes, contributions and handles, and stage 7 lists the proposal.

## API

Until 0008 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/step.ts`, which becomes the subpath `itinera/step` then, with its submodules in `src/step/`.

- **`Step`** is abstract. Its `run(...requests)` is abstract and public, as the plan's note 6 requires for parameter decorators to type its parameters, returning an `Outcome` or a promise of one, so a step without `run`, or whose `run` returns anything else, does not compile. An application compiling with `noImplicitOverride` writes `override run()`.
- **Only a subclass is a step.** `Step` has the ECMAScript private field `#step`, so a class that only has the same members does not have the type of a step, `StepClass`, which `@step` and `@withStep` take, and whose static `builder(name)` starts a step's builder for the workflow builder (see [0062](0062-workflow-descriptors.md)).
- **`Outcome`** is a discriminated union on `kind`; stage 3 has its one member `Success`, which `this.succeed()`, a protected method of `Step`, returns as one frozen object. `Failure` and `Skipped`, with `this.fail(reason)`, `this.skip()` and `this.skipBecause(reason)`, come in stage 5 with the reasons they capture.
- **`@step()`** records, in a `WeakMap` keyed by the class, which `@withStep` reads, what the class requests: the requests of its constructor's parameters, its needs, and those of `run`'s, in order, read from the table of requests (see [0062](0062-workflow-descriptors.md)). When the class is defined it throws if the class does not extend `Step` itself, if it is declared twice, or if a parameter of its constructor or of `run` has no request. `Step.builder(name)` reads the same requests from a class not declared with `@step`, until stage 4 lets it give tokens by position.
- **The requests of a step.** `@input(key, type?)` marks a parameter of the constructor with an input, required unless its type is wrapped in `optional`, its type written as a token or any other Standard Schema validator, or read from the metadata. `@service(key, serviceType)`, from `itinera/service`, `@contributor()`, from `itinera/journey`, and `@stepReporter()` mark the parameters of `run`. Service types and `@service` are in [0095](0095-services-provided-to-steps.md). Each decorator compiles only in its place, the constructor or `run` of a class extending `Step`, and on a parameter whose declared type accepts what it gives. Stage 5 has resolved the inputs as a step is built: `build(needs)` gives the constructor what the engine resolved, in `src/engine/build.ts`, each input from the step's input adapter or the data bag (see [0060](0060-input-adapters-attached-to-steps.md)), read as [0056](0056-data-bag-values.md) says. A required input without a value aborts the journey with `required data missing`, a value of another type with `wrong type`, and an optional input without one is `None`, emitting `optional_input_absent`. A constructor that throws aborts it with `step could not be built`, and so does a constructor request only a rescue step may make, which a cast lets through. The requests of `run` are resolved in stage 5's next layer; until then `run` is called with no arguments.
- **The requests of a step hook about its step**, in `src/step/request.ts`, compile only in a step policy: `@stepName()`, giving a `StepName`, `@attempt()`, giving an `Attempt`, and `@failureReason(options?)` and `@error(options?)`, giving a `Reason` and what the attempt threw, `unknown`, or, with `{ optional: true }`, an `Option` of either, as chapter 6, 6.11 point 3 suggests. A rescue step's constructor requests the reason and the error too, from stage 4's next layer. The hooks themselves are in [0010](0010-hooks-lifecycles-and-roles.md).
- **`Contributor`** and **`StepReporter`** are interfaces, `contribute(key, value)`, and `info`, `warning` and `error`, each with a message and optional data, and `setGlobalMetadata(key, value)`, each returning a promise. Values are typed `T & AsValue<T>`, so an interface whose members are values is accepted and a `Date` is not. Stage 5 makes the handles that implement them.
- **`StepDescriptor`** and **`StepOptions`** are in [0062](0062-workflow-descriptors.md). A step's name is checked not to be empty, and its retry budget to be a whole number from 0, when it is declared.
- **`Attempt`** moved to `src/step/attempt.ts`, with `nextAttempt`, which only itinera uses and `src/step.ts` does not re-export.

## Dependencies

None of its own.

## Tests

- `tests/unit/step.test.ts`: the frozen outcome of success.
- `tests/unit/step/declared.test.ts`: what `@step` records, the requests included, and every refusal when a class is defined.
- `tests/unit/step/request.test.ts` and `tests/unit/step/request.test-d.ts`: what `@input` and `@stepReporter` record, a type read from the metadata, and what does not compile: a parameter of another type, optional on a parameter that is not an `Option`, no type on a union, a literal, an `Option`, an enum or a branded string, an input on `run` or on a class that is not a step, a step reporter on another method, and data or metadata that is not a value; and what a step hook's requests about its step record, and where they do not compile.
- `tests/unit/journey/contributor.test.ts` and `tests/unit/journey/contributor.test-d.ts`: what `@contributor` records, contributing a value, and what does not compile.
- `tests/unit/engine/build.test.ts` and `tests/unit/engine/request.test.ts`: each input given in order, optional inputs, `classOf`, a copy per step, each abort, the first abort stopping the build, and an abort raised while built passed on.
- `tests/unit/step/descriptor.test.ts`: the needs given to the constructor, the step policies attached, the defaults, the retries given, a new step for every attempt, a frozen descriptor, an empty name and every retry budget that is not a whole number from 0.
- `tests/unit/step/attempt.test.ts`: the attempt, as before.
- `tests/unit/step.test-d.ts`: `Step` is abstract, needs `run`, returns only an outcome or a promise of one, a class that only looks like a step is not one, and `@step` marks only a class extending `Step`.
- `examples/step.ts`, `examples/step-reporter.ts`, `examples/contributor.ts`, and the steps of every example of a workflow.

## Done when

Every scenario tagged `@proposal-0008` passes, and 8 is listed in `conformance.json`. Planned for stage 7.
