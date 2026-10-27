# 0121: Copies that keep received data read-only

Tech spec for [proposal 0121](https://github.com/itinera-dev/spec/blob/main/proposals/0121-read-only-copies.md), implemented in [#82](https://github.com/itinera-dev/itinera-ts/issues/82). It amends [0113](0113-value-conversions.md), [0027](0027-received-data-read-only.md) and [0091](0091-adapters-read-the-data-bag.md). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0056](0056-data-bag-values.md) how a value is captured and read.

Status: complete, and 121 is listed in `conformance.json`. itinera already copied values as the proposal asks, so the layer that moved the cases to `v0.1.0-rc.18` listed it with no change to the code.

## Where itinera copies a value

| When | Who copies | Application code it calls | A copy that fails |
|---|---|---|---|
| A value is captured: contributed, emitted as event data, set as global metadata, given in a reason's details, supplied by an input adapter or a service provider, or held in an instance's initial data or initial global metadata | `capture`, in `src/value/capture.ts`, which makes a plain copy, reading each property once | the getters of what is given, and a proxy's traps | it is not a value, with the problem `threw while it was captured`, so initial data or initial global metadata is refused by `run`, listing the key |
| A request, or a read through an input adapter's access to the data bag, reads a value | `received`, in `src/value/read.ts`, which gives each one its own `structuredClone` of the plain data the data bag, or an attempt's contributions, hold | none | cannot happen |

A getter or a trap that capture calls is code the application wrote, called only to copy, keeping the type, a plain object or list, and the content, so it is a copy in the sense of chapter 1, 1.3, and not a value conversion. A `toValue()` is a value conversion, and so are a `fromValue`, a guard and a schema on a read, as [0113](0113-value-conversions.md) says.

What the data bag and an attempt's contributions hold is plain data, so the copy made for a read calls no application code, and the row of chapter 5, 5.10 for a copy that fails while a value is read has nothing to apply to in TypeScript.

## One copy for each receiver

Every request and every read is given a new copy, and no copy is frozen or shared, so a step that changes its input changes only its own copy, as design point 2 asks and [0027](0027-received-data-read-only.md) describes. A failure's reason a hook requests is a `structuredClone` of plain data too. The error a hook requests is copied by `ownCopy`, in `src/engine/own-copy.ts`, which copies property descriptors, calling no getter but the stack's, and a proxy's traps; an error is not a value, so this proposal does not cover it.

## The capability

`value-conversions` stays claimed, for `toValue()`, `fromValue`, guards and schemas: design point 1 lets a language call both kinds of code.

## Dependencies

None of its own.

## Tests

The row for a copy that fails while a value is captured is proven by `tests/unit/value/capture.test.ts`:

- "refuses a getter that throws, at its key";
- "refuses an item whose getter throws, at its index";
- "refuses a proxy that throws where it is".

That initial data or initial global metadata which is not a value is refused, listing the key, is proven by "refuses initial data and global metadata that are not values, and journey_id, naming their keys in order", in `tests/unit/engine/start.test.ts`.

The proposal adds no conformance scenario.

## Done when

Done: 121 is listed in `conformance.json`, with the cases at `v0.1.0-rc.18`.
