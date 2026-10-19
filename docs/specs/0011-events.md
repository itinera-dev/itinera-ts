# 0011: Events

Tech spec for [proposal 0011](https://github.com/itinera-dev/spec/blob/main/proposals/0011-events.md), implemented in [#7](https://github.com/itinera-dev/itinera-ts/issues/7). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals; [0040](0040-events-facts-and-decisions.md) holds the decision events, [0063](0063-dispatcher-factory.md) the dispatchers and their factories, and [0102](0102-global-metadata.md) global metadata.

Status: in progress. Stage 1 added the event types, reporters and `DebugReporter`. Stage 3 added the emitter, the guards around reporters (see 0081) and freezing. The events from steps and hooks come in stages 5 and 7, which lists the proposal.

## API

Until 0011 is listed, all of it is exported only from `itinera/unstable`. Each type is defined in the module of its concept, which becomes its subpath then:

- `src/event.ts`, later `itinera/event`: `Event`, `EventKind`, each event's type, what only events carry, such as sources and who decided a decision, and `Timestamp`, in private submodules under `src/event/`.
- `src/report.ts`, later `itinera/report`: `Reporter`, `DebugReporter`, and the dispatchers of 0063.
- Names and closed sets that events carry, in their own concepts' modules: `JourneyId`, `AbortReason` and `FailureCause` in `src/journey.ts`; `StepName`, `Attempt` and `Reason` in `src/step.ts`; `PolicyName`, `StepHook`, `WorkflowHook`, `RetryCause` and `Lifecycle` in `src/policy.ts`; `WorkflowName` and `AdapterName` in `src/workflow.ts`; `ProviderName` in `src/service.ts`.

### Event

`Event` is a discriminated union on `kind`, one member per kind of chapter 2, 29 in all, in the catalogue's order. `kind` holds the specification's snake_case name, such as `"step_given_up"`, and `EventKind` is the closed set of them, so `EventKind.StepGivenUp` and the literal `"step_given_up"` compare and narrow alike.

The fixed fields every event carries are `kind`, `sequence`, a number from 1, `timestamp`, `journeyId` and `workflow`. Events about a step add `step` and `attempt`. Every other field is named with the specification's word in camelCase, and sits on the event itself, so `event.reason.code` reads as chapter 2 reads. The one exception is who did something, when that can be more than one kind of code: a step's attempt, an input adapter, a hook or a service provider. It sits under `source` on `hook_called`, `contribution_committed`, `data_overwritten`, `global_metadata_set` and the `journey_*` events, and under `requester` on `optional_input_absent` and in an abort, each a union on its own `kind`, so a reporter tells them apart with one field.

Where the specification gives an event's fields a shape that depends on another field, the event is itself a union, so that a field absent in one case does not compile there:

1. `StepGivenUp` carries a reason and a deciding hook only when the cause is `FailWorkflow`, and `"default"` otherwise.
2. `JourneyFailed` carries a reason or an error's message, never both, as its cause allows, and a deciding hook only for `FailWorkflow`.
3. `HookCalled` carries a lifecycle only from a hook of a step policy; a workflow hook returns none.
4. `JourneyAborted` carries a `JourneyAbort`, a union on `reason`, one member per abort reason, each with the details that reason carries: the step when there is one, what was missing, the key or the event kind that was not a value, never both, `service_provided` for a provider's data and only then, the key `journey_id` for `reserved metadata key`, and the requester or source.

A custom error reaches an event only as its message, `errorMessage`, as 0083 says; the error itself reaches the result and refusals.

Engine events carry keys and never values of the data bag: no engine event has a field for one. The values an engine event does carry are its own, a reason's details and a provider's data on `service_provided`, each a `PlainValue` captured when given. The events steps and hooks emit carry a message and optional data, a `PlainValue` too.

### An abort for a step that could not be built

Chapter 2, 2.7 says an abort "while data was resolved … by or for an input adapter, or for a service provider" carries the adapter or the provider "and the key". `StepCouldNotBeBuilt` names what failed under `source`, a union on `kind`: the step itself when its constructor failed, the input adapter with the key of the input it was resolving, or the service provider. The maintainer decided on 2026-10-19 that an input adapter's failure names the adapter and the key, as 2.7 says, though chapter 4, 4.2 point 3 says only that `input_adapter_failed` names the adapter and itinera-rs named neither. A provider's failure names the provider and no key, as chapter 4, 4.9 point 6.2 says: the abort names "the step and the provider". The conformance cases do not compare either: they leave the key and the adapter of `journey_aborted` empty for this abort.

### Names and attempts

Every name an event carries is a branded string, `StepName`, `PolicyName`, `WorkflowName`, `AdapterName`, `ProviderName` and `JourneyId`, so a plain string is not mistaken for one. itinera makes them when a workflow is declared, or a journey ID when an instance is made.

`Attempt` is a class with a private constructor, so only itinera makes one: `Attempt.first`, and the next from the one before. It has `number` and `isFirst()`, and writes itself as its number in a template string and in JSON, so a reporter that prints an event as JSON prints the attempt as chapter 2 writes it.

### Timestamp

`Timestamp` is a branded string, as `Date.prototype.toISOString` writes it: ISO 8601, in UTC, to the millisecond. A string, rather than a `Date`, keeps an event plain data that can be frozen and printed as it is, and `new Date(timestamp)` reads it back.

### Closed sets

`EventKind`, `AbortReason`, `FailureCause`, `StepHook`, `WorkflowHook`, `RetryCause` and `RescueCause` are each declared once, with `closedSet` from `src/closed-set.ts`: a frozen object of names, each mapped to the specification's text, with `values`, every value in the order declared, and `has(text)`, which reads a value back only when it is written exactly so. The type of the same name is the union of its values, so a value compares with a string literal and narrows a union as a literal does. `ClosedSet`, `EveryValue` and `ValueOf` are the types an application meets.

Decision 10 of the plan chose `enum-plus` for this. Its declarations do not type-check without `skipLibCheck` on TypeScript 6.0, in each version tried, 3.0.0, 3.1.8, 3.2.1 and 3.3.1, and itinera's build and its oldest supported TypeScript check every declaration an application compiles. A closed set needs a frozen object, its values and a check, a dozen lines, so `closedSet` replaces it, as the maintainer decided on 2026-10-19. `ts-enum-util` would replace only `Object.values` and a lookup in a `Set`, and Zod's `z.enum` gives its names no documentation of their own. TypeScript's own string `enum` is ruled out too: a string literal is not assignable to one, so `"step_failed"` would not compare with `EventKind.StepFailed`, nor narrow `Event`.

TypeDoc shows a closed set as a variable, with its names in alphabetical order and without each name's documentation, which reaches an application through the declarations, in its editor. The API reference of stage 11 decides whether to change how TypeDoc renders them.

### Reporters

`Reporter` has `report(event)` and, optionally, `receiveGlobalMetadata(key, value)`, chapter 2, 2.1's **report** and **receive global metadata**, each returning nothing or a promise, so a reporter may be synchronous or asynchronous (decision 1). A reporter should handle its own trouble: a failure that escapes one aborts the journey with `reporter failed`, as 0081 says, which the engine's guards ensure.

`DebugReporter` prints each event as JSON, on a line of its own, with `console.log`. The language's declarations of the ES library leave `console` out, and the build loads no `@types/node`, so `src/report/debug-reporter.ts` declares the one method it calls.

## Dependencies

None of its own.

## The emitter

`Emitter`, in `src/engine/emitter.ts`, makes every event of a journey from what it carries: it numbers them from 1 in the order made, stamps each with the executor's clock as an ISO 8601 UTC `Timestamp`, gives each the journey ID and the workflow's name, and freezes it with everything it carries, with `frozen` in `src/engine/frozen.ts`. A reporter receives the engine's event itself, so freezing is what keeps one reporter from changing what the next receives.

## Tests

- `tests/unit/event/kind.test.ts`: every event kind is written in snake case, over `EventKind` itself.
- `tests/unit/event.test-d.ts`: `Event` has one member per kind, narrows by kind, and cannot be changed.
- `tests/unit/event/fact.test-d.ts`: a lifecycle only from a step hook.
- `tests/unit/event/abort.test-d.ts` and `tests/unit/event/abort/not-a-value.test-d.ts`: only `journey_id` is a reserved key; `service_provided` names only a provider's data; a key and an event kind never together.
- `tests/unit/event/fields.test-d.ts`, `tests/unit/step.test-d.ts`, `tests/unit/journey.test-d.ts`, `tests/unit/policy.test-d.ts`, `tests/unit/workflow.test-d.ts` and `tests/unit/service.test-d.ts`: a plain string is none of the names, the journey ID or a timestamp; an attempt cannot be constructed or changed; each closed set's type is only its values.
- `tests/unit/closed-set.test-d.ts`: a closed set's type is only its values, and the set cannot be changed.
- `tests/unit/report.test-d.ts`: a reporter need not receive global metadata, and may report asynchronously.
- `tests/unit/report/debug-reporter.test.ts`: each event printed as JSON on a line of its own.
- `tests/unit/step.test.ts`: attempts counted from 1, each after the one before, `isFirst`, written as their number as text and in JSON, and frozen.
- `tests/unit/closed-set.test.ts`: names and values, values in order, `has` reading back only a value written exactly, and frozen.
- Later stages: property-based tests with fast-check of the first and last events, increasing sequence numbers, one outcome fact per attempt, and no data bag values in engine events.

## Done when

Every scenario tagged `@proposal-0011` passes, and 11 is listed in `conformance.json`. Planned for stage 7.
