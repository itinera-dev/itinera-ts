# 0119: An attempt scripted twice, an attempt a step can never have, and reading the record of an unknown step

Tech spec for [proposal 0119](https://github.com/itinera-dev/spec/blob/main/proposals/0119-attempt-mistakes.md), implemented in [#71](https://github.com/itinera-dev/itinera-ts/issues/71). It amends [0108](0108-test-support.md).

Status: complete, and 119 is listed in `conformance.json`.

## API

No exported item is added or removed. `MistakeKind.AttemptScriptedTwice` and `MistakeKind.NoSuchAttempt`, in `itinera/testing`, already named the two mistakes, each with its step and attempt, and `ScriptedRun.step` already threw a `TestMistake` with `MistakeKind.UnknownStep` for a name the workflow does not have. What changes is the order of the checks in `onAttempt`: an attempt past the most the step can have is now `no such attempt` even after `onEveryAttempt()` or `onRemainingAttempts()`, where it was `attempt scripted twice`.

## How the rules are enforced

| Rule | Enforced by |
|---|---|
| Choosing an attempt scripted already is a mistake in the test, naming the step and the first attempt chosen again | `StepWriter`, in `src/testing/scripted/step-writer.ts`, throws `AttemptScriptedTwice` from `onAttempt`, `onEveryAttempt` and `onRemainingAttempts` |
| Choosing an attempt the step can never have is a mistake in the test, naming the step and the attempt | `StepWriter` throws `NoSuchAttempt` for a number that is not a whole number from 1, or past the `Target`'s most attempts, in `src/testing/scripted/target.ts` |
| An attempt the step can never have is named rather than one scripted already or a gap | `onAttempt` checks the number, then the most attempts, before the other two, and `onRemainingAttempts` checks the most attempts first |
| Reading the record of a step the workflow does not have stops the test where it is read | `ScriptedRun.step`, in `src/testing/scripted/record.ts`, throws a `TestMistake` |
| Reading an attempt the record does not hold reads nothing | `StepRecord.attempt` returns `None` |

No scenario is excluded. A `number` holds 0, negative numbers and fractions, so the scenarios tagged `@attempt-zero`, `@attempt-negative` and `@attempt-fraction` run: `onAttempt` refuses each such number at run time as `no such attempt`.

## Tests

- `src/testing/scripted/step-writer.test.ts`: every mistake in choosing attempts, and `names an attempt the step can never have rather than one described already`.
- The runner reads any number in a script's `attempt` column, in `src/model/testing/script.ts`, and the sentences that read the record of a step, stopping the test, and an attempt it does not hold are in `src/sentences/scripted.ts`.
