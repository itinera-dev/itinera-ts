# 0003: Rescue steps

Tech spec for [proposal 0003](https://github.com/itinera-dev/spec/blob/main/proposals/0003-rescue-steps.md), implemented in [#3](https://github.com/itinera-dev/itinera-ts/issues/3). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 4 the decorators, [0008](0008-steps.md) the steps, [0098](0098-rescue-step-adapters-and-providers.md) the adapters and providers of a rescue step, and [0062](0062-workflow-descriptors.md) the table of requests and the descriptors.

Status: in progress. Stage 4 has added the base class `RescueStep`, `@rescueStep`, `@fromRescuedStep`, and the `rescue` of `@withStep`. Its sixth layer has added the rescue step to the builders, its seventh has added it to the listing and its violations. Stage 5 has added the outcome of a failure, and stage 9 resolves a rescue step's requests, runs rescue steps and lists the proposal.

## API

Until 0003 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/step/rescue.ts` and re-exported by `src/step.ts`, which becomes the subpath `itinera/step`.

- **`RescueStep`** is abstract, like `Step`, with its own ECMAScript private brand, `#rescueStep`, so a step is not a rescue step nor a rescue step a step, and `RescueStepClass` is a class extending it. Its `run(...requests)` is abstract and returns a `RescueOutcome` or a promise of one. `RescueOutcome` is a success, made with `this.succeed()`, or a failure, made with `this.fail(reason)`, which takes a reason as a step's does (see [0008](0008-steps.md)), and never a skip, since a rescue step cannot skip, so `this.skip()` does not exist on it and a `Skip` is not a `RescueOutcome`.
- **`@rescueStep()`** takes a class extending `RescueStep` itself and records, in a `WeakMap` keyed by the class, what its constructor and its `run` request, as `@step` does. When the class is defined, it throws if the class extends another rescue step, if it is declared twice, or if a parameter has no request. `requestsOfRescue(class)` reads what it recorded.
- **Its requests.** On the constructor, `@input(key, type?)`, `@fromRescuedStep(key, type?)`, `@failureReason(options?)` and `@error(options?)`; on `run`, `@service(key, serviceType)`, `@contributor()` and `@stepReporter()`. `@fromRescuedStep` reads what the rescued step contributed under its key in the attempt that failed, typed like `@input`, and compiles only on the constructor of a rescue step. The places of the other requests were widened to take a rescue step.
- **`rescue`** in `StepOptions` names a step's rescue step. `@withStep` throws, when the class is defined, for a rescue step not declared with `@rescueStep`, and a class that does not extend `RescueStep` does not compile. `describeStep` keeps the rescue step beside the step's policies, read by `rescueOf(descriptor)` with its name, `<step name>_rescue`, and its requests, which the listing reads. When the workflow is built, a step with both a rescue step and a retry budget greater than 0 is the violation `rescued step retried`, and the rescue step's name counts among the step names for `duplicate step name` (see [0062](0062-workflow-descriptors.md)). In the listing, a step with a rescue step has a rescue section: the rescue step's name, its input adapter, if any, and its services with their providers.
- **The builders.** A step's builder takes its rescue step in `rescue(...)`: a class declared with `@rescueStep`, or a `RescueStepBuilder<C>`, in `src/step/rescue/builder.ts`, which `Refund.builder()`, a static method of `RescueStep`, starts for a class declared without decorators. That builder takes the rescue step's requests by position, with `needs` and `run`, as a step's builder does (see [0062](0062-workflow-descriptors.md)), and each refusal is thrown at once: a class not declared with `@rescueStep`, a class that declares its requests with decorators given them by position, and a parameter with no request.

## Dependencies

None of its own.

## Tests

- `tests/unit/step/rescue.test.ts`: what the constructor and `run` request, a class not marked, a class extending another rescue step, a class declared twice, a parameter with no request, the success, and what `@fromRescuedStep` records.
- `tests/unit/step/rescue.test-d.ts`: a rescue step with its requests, a rescue step is not a step nor a step a rescue step, a step named as a rescue, and `@fromRescuedStep` on a parameter of another type, in a step or on `run`.
- `tests/unit/step/descriptor.test.ts` and `tests/unit/workflow/decorators.test.ts`: the rescue step kept, none unless told, and a rescue step not declared.
- `tests/unit/step/builder.test.ts`: a declared rescue step class given to a step's builder.
- `tests/unit/step/rescue/builder.test.ts`: a rescue step's builder, its requests by position, and the refusals at once of a class not declared and of a parameter left without a request.
- `tests/unit/workflow/violation/steps.test.ts`: a rescued step retried, and a rescue step's name counted among the step names. `tests/unit/workflow/listing.test.ts`: the rescue section.
- `examples/rescue-step.ts`.

## Done when

Every scenario tagged `@proposal-0003` passes, and 3 is listed in `conformance.json`. Planned for stage 9.
