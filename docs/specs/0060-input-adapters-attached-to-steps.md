# 0060: Input adapters attached to steps

Tech spec for [proposal 0060](https://github.com/itinera-dev/spec/blob/main/proposals/0060-input-adapters-attached-to-steps.md), implemented in [#21](https://github.com/itinera-dev/itinera-ts/issues/21). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 8 the input adapters, [0091](0091-adapters-read-the-data-bag.md) an adapter's read access to the data bag, and [0062](0062-workflow-descriptors.md) the table of requests and the descriptors.

Status: complete, and 60 is listed in `conformance.json`. Stage 4 has added `@inputAdapter`, `@key` and what an adapter returns. Its sixth layer has added adapters to the builder, its seventh has added the violations about adapters and the listing, stage 5 has called an adapter as a step is built, and stage 7 listed the proposal.

## API

0060 is listed, but it stays exported only from `itinera/unstable` while it names API of proposals not yet listed, such as the rescue steps of [0003](0003-rescue-steps.md), as the agents' manual says. It is defined in `src/workflow/adapter.ts`, with what an adapter returns in `src/workflow/adapter/supplied.ts`, and re-exported by `src/workflow.ts`, which becomes the subpath `itinera/workflow`.

- **`@inputAdapter({ steps, name? })`** marks a method of a workflow class as an input adapter of the steps it names, at least one, so an empty list does not compile, and `<step name>_rescue` for a rescue step (see [0098](0098-rescue-step-adapters-and-providers.md)). Its name is the method's unless given. It is typed as the interface `InputAdapterDecorator`, generic in the method's type, and compiles only on a method of a class extending `Workflow` that returns a `Supplied` or a promise of one. It records the adapter, its name, its steps, its method and its requests in the class's declaration, in the order the methods are written.
- **What an adapter may request**: `@stepName()`, `@key()`, the key of the input it is asked for, `@fromWorkflow(key, type?)`, `@journeyId()` and `@dataBag()`. Any other request throws when the class is defined, naming the method and the request, since a parameter decorator cannot see its method's decorator to refuse it at compile time.
- **What an adapter returns.** `Supplied` is a discriminated union on `kind`: `SuppliedValue`, holding the value, and `FromDataBag`, so the input is read from the data bag under its key, as chapter 4, 4.11 point 1 suggests. A workflow makes them with its protected helpers `this.supply(value)`, which compiles only on a value, and `this.fromDataBag()`. Each object they make is recorded, so `isSupplied` tells it from one a cast makes, which stage 5 turns into the adapter's failure.
- **On the builder**, `inputAdapter(key, { steps, name? }, ...requests)` names a method of the workflow class, typed `MethodKey<InstanceType<C>, Supplied>`, so a method returning anything else, or a field, does not compile, with its requests by position (see [0062](0062-workflow-descriptors.md)). It throws at once for a field holding a function, an empty name, a request an adapter may not make, a method that declares its requests with decorators, and a parameter with no request.
- **Refused when the class is defined**: an empty name, a request an adapter may not make, a parameter with no request, a missing compiler option `emitDecoratorMetadata`, and a class that does not extend `Workflow` itself. `@workflow` refuses a method that carries requests but is marked with neither `@inputAdapter` nor `@provider`, since it would otherwise be left out without a word. The steps it names are checked against the workflow's steps when the workflow is built (see [0062](0062-workflow-descriptors.md)), in `src/workflow/violation/adapters.ts`: a name no step or rescue step has is the violation `input adapter for unknown step`, and two adapters attached to one step, `step adapted twice`, naming every adapter attached to it, which includes one adapter listing a step twice. Two adapters with one name, which `name` makes possible, are `duplicate adapter name`, naming it once. Chapter 3, 3.6 does not list that violation yet: the maintainer accepted adding it, as [spec#116](https://github.com/itinera-dev/spec/issues/116) proposes, together with saying that a step repeated in one adapter's list is `step adapted twice`.
- **In the listing**, a step or a rescue step shows the name of the adapter attached to it, if any.

## Calling an adapter

The engine calls the adapter attached to a step while it builds the step, in `src/engine/build.ts` and `src/engine/adapter.ts`, as chapter 4, 4.2 point 3 says. The descriptor keeps each adapter's method and its requests, and `WorkflowDescriptor.adapt(workflow, step, answers)` calls the method on the workflow object with the answers the engine resolved (see [0062](0062-workflow-descriptors.md)). The engine resolves them, rather than the descriptor, because resolving `@fromWorkflow` may abort the journey or emit `optional_input_absent`.

1. For each input of the step's constructor, in the order it declares them, the engine resolves the adapter's own requests, in the order the adapter declares them, and calls it once. `@stepName()` gives the step's name, `@key()` the input's key, `@journeyId()` the journey's ID, `@dataBag()` a read-only access to the data bag (see [0091](0091-adapters-read-the-data-bag.md)), and `@fromWorkflow(key, type)` a value from the data bag, read as a step's input is.
2. A request for data from the workflow without a value aborts the journey with `required data missing`, naming the adapter as the requester, before the adapter is called, and a value of another type with `wrong type`. An optional one without a value is `None`, and `optional_input_absent` names the adapter.
3. `this.supply(value)`, or a promise of it, emits `input_adapter_supplied`, with the step, the attempt, the key and the adapter, and gives the step the value, captured, then read with the input's type, as from the data bag: a value of another type aborts the journey with `wrong type`, naming the adapter. `this.fromDataBag()` emits nothing, and the input is read from the data bag; an abort for it then names no adapter.
4. A throw, a rejected promise, a return that neither helper made, and a supplied value that is not a value each emit `input_adapter_failed`, then abort the journey with `step could not be built`, whose source names the adapter and the key. The abort carries the error's message and the error for a throw, a rejection or a wrong return, which is a `TypeError` saying what was returned, and nothing for a value that is not one, as [spec#113](https://github.com/itinera-dev/spec/issues/113) says.
5. The first abort stops the build: the step is not built, and no later input is resolved.

## Dependencies

None of its own.

## Tests

- `tests/unit/workflow/adapter.test.ts`: each adapter recorded in order with its steps and requests, an empty name, a request an adapter may not make, a parameter with no request, a class extending another workflow, and, in `tests/unit/workflow/adapter/supplied.test.ts`, `isSupplied` with what the helpers make and what a cast makes.
- `tests/unit/workflow/adapter.test-d.ts`: a method returning a `Supplied` or a promise of one with every request it may make, an empty list of steps, a method returning anything else, a method outside a workflow, a value that is not one, and `@key` and `@dataBag` on a parameter of another type or outside a workflow.
- `tests/unit/workflow/base.test.ts`: what `this.supply(value)` and `this.fromDataBag()` make.
- `tests/unit/workflow/builder.test.ts` and `tests/unit/workflow/builder.test-d.ts`: an adapter named to the builder with its requests, and each refusal.
- `tests/unit/workflow/violation/adapters.test.ts`: two adapters with one name, an adapter attached to an unknown step or to the rescue step of a step without one, a step adapted twice, and a step one adapter lists twice. `tests/unit/workflow/listing.test.ts`: the adapter listed for a step and for a rescue step.
- `tests/unit/engine/adapter.test.ts`: each input asked for in order with what the adapter requests, `input_adapter_supplied`, an input left to the data bag, the adapter's own requests resolved in order, an adapter not called when one of them aborts the journey, reads through its access while called, nothing shown through an access kept after its call, and each way an adapter fails. `tests/unit/engine/build.test.ts`: the step built with what its adapter supplied, and `wrong type` naming the adapter or not.
- `examples/input-adapter.ts` and `examples/tokens-by-position.ts`.

## Done when

Done in stage 7: every scenario tagged `@proposal-0060` passes, but those that also name a proposal not yet listed, and 60 is listed in `conformance.json`.
