# 0095: Services provided to steps

Tech spec for [proposal 0095](https://github.com/itinera-dev/spec/blob/main/proposals/0095-services-provided-to-steps.md), implemented in [#31](https://github.com/itinera-dev/itinera-ts/issues/31). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 8 the service providers, [0008](0008-steps.md) the steps that request services, and [0062](0062-workflow-descriptors.md) the table of requests.

Status: in progress. Stage 4 has added `serviceType` and `@service`, a step's request for a service, then `@provider`, what a provider returns and `@providerReporter`. Its next layer adds providers to the builder, the violations about services and the listing, stage 5 resolves a step's services as it is built, and stage 8 runs the providers and lists the proposal.

## API

Until 0095 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/service.ts`, which becomes the subpath `itinera/service` then, with its submodules in `src/service/`.

- **`ServiceType<T>`** is a token for a type of service, since an interface does not exist at run time. `serviceType<T>(name)` makes one: a frozen object holding its name, for people, typed through a `unique symbol` that only itinera can name, so only `serviceType` makes one. Two service types are the same only when they are the same object, which is how `wrong service type` will compare them. An empty name throws.
- **`@service(key, serviceType)`** marks a parameter of a step's `run` with a request for a service, always required. It compiles only on a parameter of `run` of a class extending `Step`, whose declared type accepts the token's service type. It records the key and the service type in the table of requests.

- **`@provider(serviceType, { perAttempt?, steps?, key?, name? })`** marks a method of a workflow class as a service provider of the service type given. It is of journey scope unless `perAttempt` is `true`; it serves the steps it names, at least one when `steps` is given, so an empty list does not compile, and `<step name>_rescue` for a rescue step (see [0098](0098-rescue-step-adapters-and-providers.md)), or, with no `steps`, every step that requests its key and has no provider of its own for it. Its key and its name are the method's unless given. It is typed as the interface `ProviderDecorator<T>`, generic in the method's type, and compiles only on a method of a class extending `Workflow` that returns a `Provided<T>` for the token's service, or a promise of one, so a provider returning nothing, a bare instance, or an instance of another service does not compile. It records the provider in the class's declaration, in the order the methods are written.
- **What a provider may request**: `@journeyId()`, `@fromWorkflow(key, type?)`, `@providerReporter()`, `@stepName()` and `@attempt()`. Any other request throws when the class is defined, naming the method and the request. `@stepName()` or `@attempt()` on a provider of journey scope is the violation `attempt request in journey scope`, which the next layer finds with the other violations.
- **`Provided<T>`** holds the instance and, optionally, the data for reporters, and is typed through a `unique symbol` only itinera names, so only `this.provide(instance)` or `this.provide(instance, data)`, a protected helper of `Workflow`, makes one; `data` compiles only when it is a value. Each object it makes is recorded, so `isProvided` tells it from one a cast makes, which stage 8 turns into `service_provider_failed`.
- **`@providerReporter()`**, in `src/service/reporter.ts`, requests a `ProviderReporter`, whose `info`, `warning` and `error` emit `journey_info`, `journey_warning` and `journey_error`, and whose `setGlobalMetadata` sets global metadata, each returning a promise, as chapter 4, 4.9 point 7 asks.
- **Refused when the class is defined**: an empty name or key, a request a provider may not make, a parameter with no request, a missing compiler option `emitDecoratorMetadata`, and a class that does not extend `Workflow` itself. `@workflow` refuses a method that carries requests but is marked with neither `@provider` nor `@inputAdapter`.

## Dependencies

None of its own.

## Tests

- `tests/unit/service/request.test.ts`: a service type is named as given, is a new object each time, even under the same name, cannot be changed, and refuses an empty name; and what `@service` records.
- `tests/unit/service/request.test-d.ts`: a service type is made only by `serviceType`, and `@service` does not compile on a parameter of another type, on the constructor, on a method other than `run`, or outside a step.
- `tests/unit/service/provider.test.ts`: each provider recorded in order with its service, scope, steps and requests, an empty name or key, a request a provider may not make, and `isProvided` with what the helper makes and what a cast makes.
- `tests/unit/service/provider.test-d.ts`: a provider with its requests, one providing another service or a bare instance, one outside a workflow, an empty list of steps, data that is not a value, and `Provided` from a plain object.
- `tests/unit/service/reporter.test.ts`: what `@providerReporter()` records.
- `tests/unit/service/reporter.test-d.ts`: `@providerReporter` on a parameter of another type or in a hook.
- `tests/unit/workflow.test.ts`: what `this.provide(...)` makes, with and without data.
- `examples/service.ts`: a step requesting a payment gateway. `examples/provider.ts`: providers of both scopes.

## Done when

Every scenario tagged `@proposal-0095` passes, and 95 is listed in `conformance.json`. Planned for stage 8.
