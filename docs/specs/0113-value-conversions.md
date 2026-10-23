# 0113: Value conversions are calls into custom code

Tech spec for [proposal 0113](https://github.com/itinera-dev/spec/blob/main/proposals/0113-value-conversions.md), implemented in [#72](https://github.com/itinera-dev/itinera-ts/issues/72). It amends [0054](0054-how-custom-code-fails.md). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0056](0056-data-bag-values.md) how a value is captured and read.

Status: complete, and 113 is listed in `conformance.json`, with `value-conversions` among the capabilities. Stage 1 made a `toValue()` that throws while a value is captured not a value, stage 5 made a read whose conversion fails or is refused a value of another type, and the layer that listed the proposal taught the runner the converted types of the cases.

## The capability

While a journey runs, and when `run` is handed an instance, itinera calls code the application writes to turn its objects into values, and values into its types or to check them, so it claims `value-conversions`:

1. `toValue()`, on an object that serialises itself, whenever it is captured: contributed, emitted as event data, set as global metadata, given in a reason's details, supplied by an input adapter, supplied by a service provider with an instance, or held in an instance's initial data or initial global metadata.
2. A static `fromValue`, on a class that `classOf` names, a type guard that `guard` names, and any other Standard Schema validator, whenever a request or a typed read of the data bag reads a value.

## API

No exported item is added or removed. `SerialisesItself` and `ValueClass`, in `itinera/value`, already said that a `toValue()` that throws makes the object not a value, and that a `fromValue` throws when it cannot make an instance.

## How the rules are enforced

| Rule | Enforced by |
|---|---|
| A conversion that fails while a value is captured makes it not a value: a contribution, event data, global metadata, a reason's details and a service provider's data abort the journey with `not a value` | `capture`, in `src/value/capture.ts`, turns anything a `toValue()` throws into the problem `threw while it was captured`, which the handles in `src/engine/handles.ts`, `src/engine/run.ts` for a step's outcome whose details `src/step/outcome.ts` refused, `src/engine/hook/lifecycle.ts` for a hook's, and the provider in `src/engine/provider.ts` turn into `not a value` |
| An input adapter's supply whose conversion fails emits `input_adapter_failed` and aborts the journey with `step could not be built` | `src/engine/adapter.ts`, as for any supply that is not a value |
| Initial data and initial global metadata whose conversion fails are refused by `run`, listing the key, with no event | `start`, in `src/engine/start.ts`, captures every entry before anything but the check that the instance has not run, and rejects with the `Refusal` `initial values`, from `src/executor/refusal.ts` |
| A conversion that fails while a request reads a value, because a `fromValue` or a check throws, or a check refuses it, means `wrong type`, naming whom a value of the wrong type names, before the requester is called | `received`, in `src/value/read.ts`, gives `None`, and `requested`, in `src/engine/request.ts`, aborts the journey with `wrong type`, for steps, rescue steps, hooks, input adapters and service providers alike |
| A read through an input adapter's access whose conversion fails is of another type, and nothing is emitted | `readOf`, in `src/journey/read.ts`, gives `other type` when `received` gives `None` |
| A conversion is never a failure of the custom code around it | `capture` and `received` catch what a conversion throws, so neither a step's construction nor a hook nor a provider sees it |

The specification lets an abort or a refusal caused by a conversion that throws carry the conversion's error, unchecked by conformance. itinera carries none: `capture` and `received` drop what was thrown, as the maintainer approved on 2026-10-19 (plan, section 2), before the proposal allowed carrying it, so a failing conversion has the same outcome as any other value that is not one, or of another type, and every such abort or refusal has one shape.

## The runner

The runner gives the cases' converted types the conversions TypeScript uses, in `packages/conformance/src/converted.ts`:

- **`throwing record`** is `ThrowingRecord`, a class whose `toValue()` and static `fromValue` both throw an `Error` whose message is `conversion failed`. A request or a read of this type names `classOf(ThrowingRecord)`, and an object of the type is a new `ThrowingRecord` wherever a case captures one.
- **`rejected record`** is `rejectedRecordGuard`, `guard("rejected record", isRejectedRecord)`, an application's own type guard, which refuses every value without throwing.

`src/model/value.ts` names, in `caseTypes`, the types of the neutral vocabulary and the converted types, as `CaseType`, so every sentence that takes a type takes one, and scripts an object of `throwing record` as `aThrowingRecord`, which `src/given.ts` gives as a new `ThrowingRecord`. `src/tokens.ts` maps each converted type to its token. The sentences that capture one are in `src/sentences/data.ts`, `src/sentences/global-metadata.ts`, `src/sentences/reporters.ts` and `src/sentences/services.ts`, and in `answerOf`, in `src/model/adapter.ts`, for an input adapter's return; "the refusal lists the key" is in `src/sentences/outcomes.ts`.

## Dependencies

None of its own.

## Tests

- `src/value/capture.test.ts`: a `toValue` that throws is not a value, as each kind of non-value is.
- `src/value/read.test.ts`: a read gives nothing for what makes the schema throw, what a guard refuses and what `fromValue` refuses.
- The runner's `src/converted.test.ts`: both conversions of `throwing record` throw, and `rejected record` refuses every value; `src/model/value.test.ts` and `src/model/adapter.test.ts`: the converted types and an object of `throwing record` as the sentences write them.

## Done when

Done: every scenario tagged `@proposal-0113` passes, and 113 is listed in `conformance.json` with `value-conversions` among the capabilities.
