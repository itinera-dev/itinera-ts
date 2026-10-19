# 0095: Services provided to steps

Tech spec for [proposal 0095](https://github.com/itinera-dev/spec/blob/main/proposals/0095-services-provided-to-steps.md), implemented in [#31](https://github.com/itinera-dev/itinera-ts/issues/31). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, section 8 the service providers, [0008](0008-steps.md) the steps that request services, and [0062](0062-workflow-descriptors.md) the table of requests.

Status: in progress. Stage 4 has added `serviceType` and `@service`, a step's request for a service. Its later layers add `@provider` and the violations about services, stage 5 resolves a step's services as it is built, and stage 8 runs the providers and lists the proposal.

## API

Until 0095 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/service.ts`, which becomes the subpath `itinera/service` then, with its submodules in `src/service/`.

- **`ServiceType<T>`** is a token for a type of service, since an interface does not exist at run time. `serviceType<T>(name)` makes one: a frozen object holding its name, for people, typed through a `unique symbol` that only itinera can name, so only `serviceType` makes one. Two service types are the same only when they are the same object, which is how `wrong service type` will compare them. An empty name throws.
- **`@service(key, serviceType)`** marks a parameter of a step's `run` with a request for a service, always required. It compiles only on a parameter of `run` of a class extending `Step`, whose declared type accepts the token's service type. It records the key and the service type in the table of requests.

## Dependencies

None of its own.

## Tests

- `src/service/request.test.ts`: a service type is named as given, is a new object each time, even under the same name, cannot be changed, and refuses an empty name; and what `@service` records.
- `src/service/request.test-d.ts`: a service type is made only by `serviceType`, and `@service` does not compile on a parameter of another type, on the constructor, on a method other than `run`, or outside a step.
- `examples/service.ts`: a step requesting a payment gateway.

## Done when

Every scenario tagged `@proposal-0095` passes, and 95 is listed in `conformance.json`. Planned for stage 8.
