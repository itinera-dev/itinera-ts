# 0003: Rescue steps

Tech spec for [proposal 0003](https://github.com/itinera-dev/spec/blob/main/proposals/0003-rescue-steps.md), implemented in [#3](https://github.com/itinera-dev/itinera-ts/issues/3). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 4 the decorators, [0008](0008-steps.md) the steps, [0098](0098-rescue-step-adapters-and-providers.md) the adapters and providers of a rescue step, and [0062](0062-workflow-descriptors.md) the table of requests and the descriptors.

Status: in progress. Stage 4 has added the base class `RescueStep`, `@rescueStep`, `@fromRescuedStep`, and the `rescue` of `@withStep`. Its next layer adds the rescue step to the builder, the step descriptor and the listing, stage 5 the outcome of a failure and the resolution of a rescue step's requests, and stage 9 runs rescue steps and lists the proposal.

## API

Until 0003 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/step/rescue.ts` and re-exported by `src/step.ts`, which becomes the subpath `itinera/step`.

- **`RescueStep`** is abstract, like `Step`, with its own ECMAScript private brand, `#rescueStep`, so a step is not a rescue step nor a rescue step a step, and `RescueStepClass` is a class extending it. Its `run(...requests)` is abstract and returns a `RescueOutcome` or a promise of one. `RescueOutcome` is a success only, made with `this.succeed()`, since a rescue step cannot skip; stage 5 adds `this.fail(reason)` with the outcome of a failure.
- **`@rescueStep()`** takes a class extending `RescueStep` itself and records, in a `WeakMap` keyed by the class, what its constructor and its `run` request, as `@step` does. When the class is defined, it throws if the class extends another rescue step, if it is declared twice, or if a parameter has no request. `requestsOfRescue(class)` reads what it recorded.
- **Its requests.** On the constructor, `@input(key, type?)`, `@fromRescuedStep(key, type?)`, `@failureReason(options?)` and `@error(options?)`; on `run`, `@service(key, serviceType)`, `@contributor()` and `@stepReporter()`. `@fromRescuedStep` reads what the rescued step contributed under its key in the attempt that failed, typed like `@input`, and compiles only on the constructor of a rescue step. The places of the other requests were widened to take a rescue step.
- **`rescue`** in `StepOptions` names a step's rescue step. `@withStep` throws, when the class is defined, for a rescue step not declared with `@rescueStep`, and a class that does not extend `RescueStep` does not compile. `describeStep` keeps the rescue step beside the step's policies, read by `rescueOf(descriptor)`, a stand-in that only tests read until the next layer gives the step descriptor its rescue section. The builder's `step` takes no `rescue` until then.

## Dependencies

None of its own.

## Tests

- `src/step/rescue.test.ts`: what the constructor and `run` request, a class not marked, a class extending another rescue step, a class declared twice, a parameter with no request, the success, and what `@fromRescuedStep` records.
- `src/step/rescue.test-d.ts`: a rescue step with its requests, a rescue step is not a step nor a step a rescue step, a step named as a rescue, and `@fromRescuedStep` on a parameter of another type, in a step or on `run`.
- `src/step/descriptor.test.ts` and `src/workflow/decorators.test.ts`: the rescue step kept, none unless told, and a rescue step not declared.
- `examples/rescue-step.ts`.

## Done when

Every scenario tagged `@proposal-0003` passes, and 3 is listed in `conformance.json`. Planned for stage 9.
