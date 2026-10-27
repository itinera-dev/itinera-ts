# Changelog

Every release of the package `itinera` on npm. Each release says the version of the [Itinera specification](https://github.com/itinera-dev/spec) it implements, the tier, the capabilities claimed and the [conformance cases](https://github.com/itinera-dev/conformance) it passes; its conformance report and its API reference are attached to its GitHub release. Before 1.0, a breaking change raises the minor version and a fix the patch version.

## [0.1.0-beta.6]

The second release, a beta, published under the dist-tag `next`: specification 0.1.0, tier 1, capabilities `async`, `testing` and `value-conversions`, cases `v0.1.0-rc.18`. It breaks code written for `0.1.0-beta.5`. It implements proposal 0121, which says that a copy made to keep received data read-only is not a value conversion, and which changes nothing itinera does, and proposal 0122, on custom code that returns what its call cannot return, which now aborts the journey with `unexpected result`, or refuses `run`. TypeScript's types already refuse every such result where no cast hides it, so the scenarios tagged `unexpected-result` and `non-string-journey-id` are claimed impossible to express, each with a proof. It runs on Node 22.12 and later, and applications compile it with TypeScript 5.5 or later.

### Added

- `AbortReason.UnexpectedResult` in `itinera/journey`, the abort reason `unexpected result`, never retried.
- `UnexpectedResult` in `itinera/event`, the abort for custom code that returned what its call cannot return, naming the code and carrying a `message` saying what it returned.
- `ByProviderForKey` and `ByPolicy` in `itinera/event`, the sources of an `UnexpectedResult` returned by a service provider or by a step policy's constructor.
- `UnexpectedResultReturned` in `itinera/executor`, the refusal of `run` when the dispatcher factory returns what is not a dispatcher, or a workflow policy's constructor another object.

### Changed

- A step's or rescue step's `run` that returns what is not an outcome aborts the journey with `unexpected result`, never retried, instead of ending in an abnormal termination.
- A step hook that returns `undefined`, or anything else that is not a lifecycle, aborts the journey with `unexpected result`, instead of keeping the default or aborting it with `invalid lifecycle`.
- `JourneyAbort` in `itinera/event` gains `UnexpectedResult`, and `Refused` in `itinera/executor` gains `UnexpectedResultReturned`, so an exhaustive match over either needs a case for it.
- `InvalidLifecycle.step` in `itinera/event` is always there, since only a step hook's lifecycle is read.
- What a workflow hook returns, or what its promise resolves to, is never read, where anything but `undefined` aborted the journey with `invalid lifecycle`.
- An input adapter or a service provider that returns what its helpers did not make aborts the journey with `unexpected result`, with no adapter or provider event, instead of `step could not be built`.
- The constructor of a step, a rescue step or a step policy that returns an object that is not a step, a rescue step or a step policy, as `instanceof` says, aborts the journey with `unexpected result`, where a step's or rescue step's ended its attempt in an abnormal termination.
- A dispatcher factory that returns what is not a dispatcher refuses `run` with `unexpected result`, instead of `run` being refused later with `dispatcher failed` or `global metadata not set`, or the journey aborting with `reporter failed`.
- `instance()` throws a `TypeError` when the ID generator returns an empty string, and the message of that `TypeError` for an ID that is not a string now ends "not a journey ID".

## [0.1.0-beta.5]

The first release, a beta, published under the dist-tag `next`: specification 0.1.0, tier 1, capabilities `async`, `testing` and `value-conversions`, cases `v0.1.0-rc.16`. Its version matches that of itinera-rs, whose `0.1.0-beta.5` passes the same cases. It runs on Node 22.12 and later, and applications compile it with TypeScript 5.5 or later.

### Added

- Each concept imported from a subpath of its own, such as `itinera/step` or `itinera/workflow`, with `import` and `require` alike; the package root exports nothing of its own, and `itinera/unstable`, for API that may still change, is empty.
- Steps, classes extending `Step` and marked with `@step`, that request what they need, such as inputs from the data bag with `@input`, a contributor or a service, and end with an outcome: `this.succeed()`, `this.fail(...)` or `this.skip()`. Only an attempt that succeeds commits its contributions to the data bag of values. A retry budget alone decides whether a failed or abnormally terminated attempt is tried again; a step declared with `noRetryOnAbnormalTermination` is not retried after an abnormal termination.
- Workflows, classes extending `Workflow`, marked with `@workflow` and listing their steps with `@withStep`, and made with `Orders.build(...)`; or put together without decorators with `Orders.builder()`, for compilers that record no decorator metadata. A workflow that breaks a rule of the specification throws `Violations`, and `listing()` lists its steps, each with its policies, input adapter, services and rescue step. Workflow descriptors, step descriptors and instances are sealed: only itinera makes them, so one written by hand does not compile, and `run` rejects with a `TypeError` an instance that a cast lets through.
- Step and workflow policies, with every hook kind, its requests and the lifecycles it returns, and roles the workflow implements; input adapters, methods of the workflow marked with `@inputAdapter`, which supply a step's input from the data bag.
- Rescue steps: a step may have a rescue step, which runs when the step fails or terminates abnormally and, once it succeeds, lets the step run again. Input adapters and service providers are attached to it by the name `<step name>_rescue`.
- Services that steps request by key and by a service type made with `serviceType`, made by service providers, methods of the workflow marked with `@provider`, for the journey or for each attempt, and attached to chosen steps, or to none, serving every step that requests their key and has no provider of its own; a provider returns its service made with `this.provide(...)`, which names the implementation on the `service_provided` event.
- Workflow instances with their initial data, journey IDs, made by a method marked with `@idGenerator` or as a random UUID, and global metadata, and `LocalExecutor`, whose `run` resolves to the journey's result, with `output(...)` reading its data bag, or rejects with a `Refusal` before any journey.
- Values, the only data a journey holds, checked by type tokens built on Zod, such as `string`, `integer`, `listOf(...)` and `classOf(...)`; an application's own Zod schemas, through `z` from `itinera/schema`, and other Standard Schema validators also serve as tokens, and `optional(...)` requests a value that may be absent, as an `Option`, `Some` or `None` from `itinera/option`. A class becomes a value through `toValue()` and comes back through `fromValue`, and a conversion that fails means `wrong type` or `not a value`, as the specification says.
- Events, reporters, dispatchers and their factories, with `DefaultDispatcher`, and `DebugReporter`, which prints every event. Global metadata: entries of a key and a value, apart from the data bag, that every reporter receives as soon as each one is set, starting with the journey ID; steps, hooks and service providers set entries with `setGlobalMetadata`.
- Test support, from `itinera/testing`: `RecordingReporter`, which keeps every event and the latest value of each entry of global metadata, and whose `path` lists the flow a journey took; `fakeProvider`, which puts a fake in place of a service provider for one instance; scripted runs, which play what named steps' attempts do without their business rules; recorders that lend a step, a hook or an input adapter its handles outside any journey; and mocks of steps, rescue steps and policies.
- Compile errors, instead of checks while a journey runs, for the rules the specification lets an implementation make impossible to express: a lifecycle a hook may not return, a policy whose role the workflow does not implement, a rescue step that skips, a service provider returning what `this.provide(...)` does not make, and an input adapter writing to the data bag. Steps, rescue steps and policies keep no static data, refused at compile time where TypeScript can and when they are declared otherwise.

[0.1.0-beta.6]: https://github.com/itinera-dev/itinera-ts/releases/tag/v0.1.0-beta.6
[0.1.0-beta.5]: https://github.com/itinera-dev/itinera-ts/releases/tag/v0.1.0-beta.5
