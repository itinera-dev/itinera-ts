# 0040: Events record facts and decisions

Tech spec for [proposal 0040](https://github.com/itinera-dev/spec/blob/main/proposals/0040-events-facts-and-decisions.md), implemented in [#12](https://github.com/itinera-dev/itinera-ts/issues/12). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0011](0011-events.md) the events themselves.

Status: in progress. Stage 1 added the types of the decision events. Stage 3 added the executor's decision after an abnormal termination, a pure function (see 0024). The decisions after a failure and a skip come in stage 6, the hooks around them in stage 7, which lists the proposal.

## API

Until 0040 is listed, these types are exported only from `itinera/unstable`. They are defined in `src/event/decision.ts`, re-exported by `src/event.ts`, which becomes the subpath `itinera/event` then.

- Facts and decisions are members of one union, `Event`, with no marker of their own: the kind tells which it is, as chapter 2 lists them.
- The decision events are `StepRetrying`, `StepRescuing`, `StepRescued`, `StepGivenUp`, `JourneySucceeded` and `JourneyFailed`.
- **Who decided** is the field `decidedBy` on every decision event: `"default"`, or a `DecidingHook`, the policy's name and the hook. A decision that only the default can make, such as a retry, has the type `"default"` alone, so a hook there does not compile.
- `StepGivenUp` and `JourneyFailed` are unions, so the deciding hook and the reason come together with the cause `FailWorkflow`, and the default's causes come without one. The hooks that can give a step up are `on step retry` and `on step abnormal termination`, and only `on step success` decides `journey_succeeded`.
- The causes are closed sets: `RetryCause` in `src/policy.ts`, `RescueCause` in `src/event/decision.ts`, and `FailureCause` in `src/journey.ts`, since the result carries it too.

## Dependencies

None of its own.

## Tests

- `tests/unit/event/decision.test-d.ts`: a deciding hook and a reason only when a hook gave the step up, and only `on step retry` or `on step abnormal termination` as that hook; only `on step success` deciding `journey_succeeded`; retries and rescues decided by the default alone; a reason, never an error, when a failure fails the journey, and never both when retries are exhausted.
- Later stages: the decision logic as a pure function inside the engine, with property-based tests with fast-check of one outcome fact per attempt and one decision per failed attempt.

## Done when

Every scenario tagged `@proposal-0040` passes, and 40 is listed in `conformance.json`. Planned for stage 7.
