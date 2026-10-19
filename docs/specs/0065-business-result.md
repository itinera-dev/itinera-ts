# 0065: The journey result is a business outcome

Tech spec for [proposal 0065](https://github.com/itinera-dev/spec/blob/main/proposals/0065-business-result.md), implemented in [#26](https://github.com/itinera-dev/itinera-ts/issues/26). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0083](0083-what-failures-carry.md) what a failure and an abort carry, and [0085](0085-aborted-result-has-no-data.md) the aborted result.

Status: in progress. Stage 3 added `JourneyResult`, its statuses and the data bag it hands over. Stage 6 added `output` and lists the proposal.

## API

Until 0065 is listed, everything here is exported only from `itinera/unstable`. It is defined in `src/journey/result.ts`, `src/journey/failure.ts`, `src/journey/abort.ts` and `src/journey/data-bag.ts`, re-exported by `src/journey.ts`, which becomes the subpath `itinera/journey` then.

- **`JourneyResult`** is an interface, frozen once made: `journeyId`, `status`, `failure`, `abort`, and `isSucceeded()`, `isFailed()` and `isAborted()`, each a type guard narrowing `status`, so the data bag is read without a switch, as chapter 5, 5.14 suggests.
- **`JourneyStatus`** is a discriminated union on `kind`: `Succeeded` with the `dataBag`, `Failed` with the `failure` and the `dataBag`, and `Aborted` with the `abort` only.
- **`DataBag`** is a class only itinera makes, with a private constructor and a module-private maker set in a static block, as `Attempt` is. Stage 3 gave it `keys()`, in the order each key was first set; stage 5 has added its typed read, `read(key, type)`, giving a `Read` (see [0091](0091-adapters-read-the-data-bag.md)).
- **`output(shape)`** reads the journey's output from its data bag, the counterpart of Rust's `result.output::<Receipt>()` and `#[derive(Output)]`: a type cannot be read at run time, so the shape is written, one type per key, as a typed read of the data bag takes it, such as `result.output({ receipt: string, note: optional(string) })`, and the compiler types what it gives, `{ readonly receipt: string; readonly note: Option<string> }`, from the shape (`Output<S>`). Each key is read as `DataBag.read` reads it, so a type wrapped in `optional` gives an `Option`, and `classOf(C)` an instance made by `fromValue`. What it gives is frozen. It is defined in `src/journey/output.ts`.
- **`OutputError`** is what `output` throws when the output cannot be read, an `Error` subclass, like `Refusal`, with a `problem`, a discriminated union on `kind`: `aborted`, for a journey that was aborted, which has no data bag; `absent`, with the `key`, for a key that holds no value and whose type is not optional; and `other type`, with the `key`, for a value its type refuses. Keys are read in the shape's order, and the first that cannot be read is the one named.
- **No step statuses.** The result never carries them nor the step that failed; the conformance runner derives them from the events. Neither the package nor test support offers a way to derive them, which point 3 of the proposal allows but does not ask for; the recording reporter's `path` lists the flow of a journey for tests.
- **A refusal is not a result.** `run` rejects with a `Refusal` instead (see 0012).

## Dependencies

None of its own.

## Tests

- `tests/unit/journey/result.test.ts`: each status's guards, `failure` and `abort`, the frozen result, the output of a journey that succeeded or failed, and the `OutputError` for an aborted journey.
- `tests/unit/journey/output.test.ts`: each key read as its type, an optional key, a class, the frozen output, and the `OutputError` for a key with no value, a value of another type and the first such key in the shape's order; `tests/unit/journey/output.test-d.ts`: what `output` gives for each kind of type.
- `tests/unit/journey/data-bag.test.ts`: keys in order, a copy of what it was made from, and each kind of read.
- `tests/unit/journey.test-d.ts`: the data bag reached only through a status that has one.
- `tests/unit/engine.test.ts`: the result of a journey that succeeded, failed or was aborted, and its journey ID.
- `examples/journey-result.ts`, `examples/data-bag.ts` and `examples/output.ts`.

## Done when

Every scenario tagged `@proposal-0065` passes, and 65 is listed in `conformance.json`. Planned for stage 6.
