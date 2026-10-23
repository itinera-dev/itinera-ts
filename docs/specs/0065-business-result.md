# 0065: The journey result is a business outcome

Tech spec for [proposal 0065](https://github.com/itinera-dev/spec/blob/main/proposals/0065-business-result.md), implemented in [#26](https://github.com/itinera-dev/itinera-ts/issues/26). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0083](0083-what-failures-carry.md) what a failure and an abort carry, and [0085](0085-aborted-result-has-no-data.md) the aborted result.

Status: in progress. Stage 3 added `JourneyResult`, its statuses and the data bag it hands over. Stage 6 adds `output` and lists the proposal.

## API

Until 0065 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/journey/result.ts`, `src/journey/failure.ts`, `src/journey/abort.ts` and `src/journey/data-bag.ts`, re-exported by `src/journey.ts`, which becomes the subpath `itinera/journey` then.

- **`JourneyResult`** is an interface, frozen once made: `journeyId`, `status`, `failure`, `abort`, and `isSucceeded()`, `isFailed()` and `isAborted()`, each a type guard narrowing `status`, so the data bag is read without a switch, as chapter 5, 5.14 suggests.
- **`JourneyStatus`** is a discriminated union on `kind`: `Succeeded` with the `dataBag`, `Failed` with the `failure` and the `dataBag`, and `Aborted` with the `abort` only.
- **`DataBag`** is a class only itinera makes, with a private constructor and a module-private maker set in a static block, as `Attempt` is. Stage 3 gives it `keys()`, in the order each key was first set; stage 5 adds its typed reads.
- **No step statuses.** The result never carries them nor the step that failed; the conformance runner derives them from the events.
- **A refusal is not a result.** `run` rejects with a `Refusal` instead (see 0012).

## Dependencies

None of its own.

## Tests

- `tests/unit/journey/result.test.ts`: each status's guards, `failure` and `abort`, and the frozen result.
- `tests/unit/journey/data-bag.test.ts`: keys in order, and a copy of what it was made from.
- `tests/unit/journey.test-d.ts`: the data bag reached only through a status that has one.
- `tests/unit/engine.test.ts`: the result of a journey that succeeded, failed or was aborted, and its journey ID.
- `examples/journey-result.ts`.

## Still open

What `output` gives back when a key is missing or of another type, or when the journey was aborted; settled in stage 6.

## Done when

Every scenario tagged `@proposal-0065` passes, and 65 is listed in `conformance.json`. Planned for stage 6.
