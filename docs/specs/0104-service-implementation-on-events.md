# 0104: The implementation a service provider made, and its data

Tech spec for [proposal 0104](https://github.com/itinera-dev/spec/blob/main/proposals/0104-service-implementation-on-events.md), implemented in [#34](https://github.com/itinera-dev/itinera-ts/issues/34). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 8 the service providers, and [0095](0095-services-provided-to-steps.md) the providers and how the engine calls them.

Status: in progress. Stage 1 added `service_provided` with its `implementation` and optional `data`, and the abort for data that is not a value, `NotAValueInServiceProvided`. Stage 4 added `this.provide(instance, data)`. Stage 8 names the implementation and captures the data when a provider returns; its runner pull request lists the proposal.

## API

Until 0104 is listed, these are exported only from `itinera/unstable`.

- **What a provider supplies.** `this.provide(instance, data)`, a protected helper of `Workflow`, compiles only when `data` is a value, typed `D & AsValue<D>` as event data is (see [0064](0064-event-data-values.md)). Without `data`, the `Provided` it makes has no `data`, and `service_provided` carries none.
- **The data captured.** The engine captures the data once the provider has returned, or its promise has settled, in `src/engine/provider.ts`, with the one capture every value goes through (see [0056](0056-data-bag-values.md)), so `service_provided` carries its own copy, frozen with the event. Data that is not a value, which only a cast or a value types cannot refuse lets through, such as `NaN` or a cycle, aborts the journey with `not a value`, naming the step, the provider and the event kind `service_provided`, as `NotAValueInServiceProvided`. Neither `service_provided` nor `service_provider_failed` is emitted, the step is not given the instance, and an instance of journey scope made in that call is never kept.
- **The implementation**, in `src/service/implementation.ts`, is the name of the instance's class, as the runtime reports it: the own `name` of the function its prototype's own `constructor` holds. TypeScript cannot tell an instance's concrete type when it has no class of its own, and then the implementation is the service type's name, given to `serviceType(name)`: for a plain object, an object with no prototype, a function, a value that is not an object, an instance of an anonymous class, a class whose `name` is a static getter, and a proxy whose trap throws. It reads both without calling a getter, so naming the implementation runs no code of the application's but a proxy's traps, and never throws.
- **Minifiers rename classes.** A bundler that minifies class names changes the implementation each event names; the documentation says so, and the specification lets the format change between toolchains.

## Dependencies

None of its own.

## Tests

- `tests/unit/service/implementation.test.ts`: each kind of instance and the name it gives.
- `tests/unit/engine/provider.test.ts`: `service_provided` naming the class or the service type, carrying the data captured, carrying none when none was supplied, and the abort for data that is not a value, with no service event.
- `examples/provider.ts`: a provider supplying data with its instance.

## Done when

Every scenario tagged `@proposal-0104` passes, and 104 is listed in `conformance.json`. Planned for stage 8.
