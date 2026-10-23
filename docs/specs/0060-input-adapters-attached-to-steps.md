# 0060: Input adapters attached to steps

Tech spec for [proposal 0060](https://github.com/itinera-dev/spec/blob/main/proposals/0060-input-adapters-attached-to-steps.md), implemented in [#21](https://github.com/itinera-dev/itinera-ts/issues/21). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 8 the input adapters, [0091](0091-adapters-read-the-data-bag.md) an adapter's read access to the data bag, and [0062](0062-workflow-descriptors.md) the table of requests and the descriptors.

Status: in progress. Stage 4 has added `@inputAdapter`, `@key` and what an adapter returns. Its next layer adds adapters to the builder, the violations about adapters and the listing, stage 5 calls an adapter as a step is built, and stage 7 lists the proposal.

## API

Until 0060 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/workflow/adapter.ts` and re-exported by `src/workflow.ts`, which becomes the subpath `itinera/workflow`.

- **`@inputAdapter({ steps, name? })`** marks a method of a workflow class as an input adapter of the steps it names, at least one, so an empty list does not compile, and `<step name>_rescue` for a rescue step (see [0098](0098-rescue-step-adapters-and-providers.md)). Its name is the method's unless given. It is typed as the interface `InputAdapterDecorator`, generic in the method's type, and compiles only on a method of a class extending `Workflow` that returns a `Supplied` or a promise of one. It records the adapter, its name, its steps, its method and its requests in the class's declaration, in the order the methods are written.
- **What an adapter may request**: `@stepName()`, `@key()`, the key of the input it is asked for, `@fromWorkflow(key, type?)`, `@journeyId()` and `@dataBag()`. Any other request throws when the class is defined, naming the method and the request, since a parameter decorator cannot see its method's decorator to refuse it at compile time.
- **What an adapter returns.** `Supplied` is a discriminated union on `kind`: `SuppliedValue`, holding the value, and `FromDataBag`, so the input is read from the data bag under its key, as chapter 4, 4.11 point 1 suggests. A workflow makes them with its protected helpers `this.supply(value)`, which compiles only on a value, and `this.fromDataBag()`. Each object they make is recorded, so `isSupplied` tells it from one a cast makes, which stage 5 turns into the adapter's failure.
- **Refused when the class is defined**: an empty name, a request an adapter may not make, a parameter with no request, a missing compiler option `emitDecoratorMetadata`, and a class that does not extend `Workflow` itself. `@workflow` refuses a method that carries requests but is marked with neither `@inputAdapter` nor `@provider`, since it would otherwise be left out without a word. The steps it names are checked against the workflow's steps in the next layer, as the violation `input adapter for unknown step`.

## Dependencies

None of its own.

## Tests

- `tests/unit/workflow/adapter.test.ts`: each adapter recorded in order with its steps and requests, an empty name, a request an adapter may not make, a parameter with no request, a class extending another workflow, and `isSupplied` with what the helpers make and what a cast makes.
- `tests/unit/workflow/adapter.test-d.ts`: a method returning a `Supplied` or a promise of one with every request it may make, an empty list of steps, a method returning anything else, a method outside a workflow, a value that is not one, and `@key` and `@dataBag` on a parameter of another type or outside a workflow.
- `tests/unit/workflow.test.ts`: what `this.supply(value)` and `this.fromDataBag()` make.
- `examples/input-adapter.ts`.

## Done when

Every scenario tagged `@proposal-0060` passes, and 60 is listed in `conformance.json`. Planned for stage 7.
