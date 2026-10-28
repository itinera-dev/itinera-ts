# 0042: Configuration errors are caught before a journey starts

Tech spec for [proposal 0042](https://github.com/itinera-dev/spec/blob/main/proposals/0042-configuration-errors-before-the-journey.md), implemented in [#14](https://github.com/itinera-dev/itinera-ts/issues/14). [0032](0032-configuration-errors.md) holds when each configuration error is caught, [0062](0062-workflow-descriptors.md) the violations and the builder, and [0012](0012-local-executor.md) the refusals of `run`.

Status: complete, and 42 is listed in `conformance.json`. Stage 4 checked every violation when a class is defined and when the builder builds, and sealed descriptors and instances. Stage 6 listed the proposal. Since stage 10, its API is exported from the subpaths of its concepts.

## How the rules hold

- **When the workflow is built** means, in TypeScript, when its class is defined, which is when its module is first imported: `@workflow`, on the top line, runs last, checks every violation of chapter 3, 3.6 that the types do not rule out, and throws them all at once as `Violations`, an `Error` subclass listing each. For a workflow put together through the builder it also means when the builder's `build()` runs: it makes a new descriptor, checks it whole, and throws `Violations` before the constructor runs (decision 11). Whatever the types can refuse does not compile, as chapter 3, 3.7 point 1 prefers.
- **No journey ID and no event.** A class refused when it is defined, or a workflow `build()` refused, has no workflow object, so no instance and no ID generator call. A refusal by `run` happens before the dispatcher is created, so no event is emitted (see 0012).
- **No descriptor written by hand.** Descriptors and instances are sealed (decision 15), so `run` checks none for violations: every descriptor it meets was checked when it was made, and is frozen. This replaces what #14 planned, a check by `run` of descriptors written by hand.
- **`mode not accepted` does not arise.** One asynchronous executor accepts synchronous and asynchronous steps, hooks, input adapters, providers and reporters alike (decision 1), so the scenario "A synchronous-only executor refuses an asynchronous step before the journey starts", tagged `@capability-sync`, does not run, and needs no entry under `impossible`.
- **No `invalid configuration`.** The abort reason is not in `AbortReason`, and there are no configuration-check capabilities.

## Dependencies

None of its own.

## Tests

- `tests/unit/workflow/violation.test.ts`, the tests of each submodule of `src/workflow/violation/`, under `tests/unit/workflow/violation/`, `tests/unit/workflow/builder.test.ts` and `tests/unit/workflow/decorators.test.ts`: every violation, all at once, before any workflow object exists.
- `tests/unit/workflow/descriptor.test-d.ts`, `tests/unit/step/descriptor.test-d.ts` and `tests/unit/instance/made.test-d.ts`: a descriptor or an instance written by hand does not compile.
- `tests/unit/executor/local.test.ts`: an instance `instance()` did not make, rejected before any refusal.

## Done when

Done in stage 6, and 42 is listed in `conformance.json`. Of its scenarios, one runs now, in `0032-configuration-errors`; the one tagged `@capability-sync` does not run; and the seven also tagged `@proposal-0003` run once 3 is listed in stage 9.
