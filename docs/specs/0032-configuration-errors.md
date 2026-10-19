# 0032: Configuration errors found while running

Tech spec for [proposal 0032](https://github.com/itinera-dev/spec/blob/main/proposals/0032-configuration-errors.md), implemented in [#11](https://github.com/itinera-dev/itinera-ts/issues/11). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0042](0042-configuration-errors-before-the-journey.md) the configuration errors caught before a journey, [0062](0062-workflow-descriptors.md) the violations, and [0083](0083-what-failures-carry.md) what an abort carries.

Status: complete, and 32 is listed in `conformance.json`. Stage 3 added the aborted result and the journey-abort error, stage 4 every violation, and stage 5 the aborts a step's build and run can raise. Stage 6 listed the proposal. Its API stays in `itinera/unstable` while it names API of proposals not yet listed, as the agents' manual says.

## When each configuration error is caught

| When | What | Where it lives |
|---|---|---|
| At compile time | whatever the types can refuse: a request that does not fit its parameter, a role not provided, a part given to the builder that is not a class extending its base class, tokens by position that do not fit, the arguments of `build()` and `constructWith()`, and the builder's `build()` before `constructWith()` for a constructor that needs arguments | the types of `src/workflow/`, `src/step/` and `src/declaration/` |
| When a class is defined | a request that writes no type where the metadata cannot give one, and every violation of chapter 3, 3.6 that the types do not rule out, thrown at once as `Violations` by `@workflow`, which runs last | `src/declaration/metadata.ts`, `src/workflow/decorators.ts`, `src/workflow/violation.ts` |
| When a builder method is called | a misuse it can see alone, such as an empty name or a retry budget that is not a whole number from 0, thrown at once | `src/step/builder.ts`, `src/workflow/builder.ts` |
| When the builder's `build()` runs | every violation of chapter 3, 3.6 in the new descriptor, thrown at once as `Violations` before the constructor runs, and a workflow with no name | `src/workflow/builder.ts`, `src/workflow/violation.ts` |
| When an instance is made | a workflow object `build()` did not make, which only a cast lets through | `src/workflow/base.ts` |
| When `run` is called | an instance `instance()` did not make, rejected with a `TypeError`, then the refusals of chapter 3, 3.7 and 5.9, each a `Refusal` with no event (see [0012](0012-local-executor.md)) | `src/executor.ts`, `src/engine/start.ts` |
| While the journey runs | what can only be found then, such as a required input missing or of another type, or a step that cannot be built: the journey is aborted | `src/engine/` |

Descriptors and instances are sealed (decision 15), so `run` never meets a descriptor written by hand and checks none for violations, as chapter 3, 3.7 point 2 allows of a descriptor checked when it was made.

## Aborts

- **An abort is final.** The engine records the first abort and throws the journey-abort error, `JourneyAbortError` in `src/engine/signal.ts`, which the package never exports. Only `runJourney`, in `src/engine.ts`, catches it: the events already emitted stay, `journey_aborted` is emitted last, and the result is aborted, with the abort reason, its details and no data bag (see [0085](0085-aborted-result-has-no-data.md)).
- **Abort reasons** are the closed set `AbortReason`, declared with `closedSet` (decision 10, as changed on 2026-10-19), in `src/journey.ts`. There is no `invalid configuration`, which 0042 removed.
- **An abort no error caused carries no error**, such as a required input that is missing: `Abort` has `error` and `errorMessage` only when custom code threw (see [0083](0083-what-failures-carry.md)).

## Dependencies

None of its own.

## Tests

- `src/workflow/violation.test.ts` and the tests beside each submodule of `src/workflow/violation/`: every violation, all reported at once.
- `src/workflow/builder.test.ts` and `src/workflow/decorators.test.ts`: violations thrown before the constructor runs, and when a class is defined.
- `src/engine/start.test.ts` and `src/executor.test.ts`: the refusals, with no event.
- `src/engine/request.test.ts`, `src/engine/build.test.ts` and `src/engine.test.ts`: aborts found while running, the events before them kept, `journey_aborted` last, and no data bag.

## Done when

Done in stage 6: every scenario tagged `@proposal-0032` passes, but "An abort that no error caused carries no error", which is also tagged `@proposal-0083` and runs once 83 is listed in stage 7, and 32 is listed in `conformance.json`.
