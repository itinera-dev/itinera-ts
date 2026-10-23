# 0056: Everything in the data bag is a value

Tech spec for [proposal 0056](https://github.com/itinera-dev/spec/blob/main/proposals/0056-data-bag-values.md), implemented in [#18](https://github.com/itinera-dev/itinera-ts/issues/18). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals.

Status: in progress. Stage 1 added the types of values and the function that captures one. Stage 3 gave the data bag its initial data, and stage 5 what input adapters supply, the contributions, the details of a reason and what a step reporter is given, all captured by that function, and the function that reads a value back; stage 6 lists the proposal.

## API

Until 0056 is listed, these types are exported only from `itinera/unstable`. They are defined in `src/value.ts`, which becomes the subpath `itinera/value` then.

- **`PlainValue`**: `null`, a boolean, a number, a string, a list of plain values, or a plain object of them, with string keys. It is the form in which itinera keeps every value.
- **`SerialisesItself`**: an object with `toValue(): Value`. itinera calls `toValue()` once, when the object is given, and keeps what it returns. A class whose instances a request reads back also has a static `fromValue`.
- **`Value`**: plain data in which any part may be an object that serialises itself. Functions, `undefined`, symbols, `bigint`, `Date`, `Map` and other objects with methods do not compile where a `Value` is expected.
- **`AsValue<T>`**: `T` when every part of `T` is a value, and otherwise a type nothing is assignable to. A function taking any value whose type it infers takes `value: T & AsValue<T>`, so that interfaces, which TypeScript gives no index signature and so are not assignable to `Value`, are accepted, and a function, `undefined`, a symbol, a `bigint` or an object with methods at any depth is refused. TypeScript 5.5 infers a list literal given there as a tuple, and later versions as a list; both are accepted. Some types pass that the run-time check refuses: an instance of a class whose members are all data, `object` and `{}`, which are also the type of an empty object, a property with a symbol key, and, without `exactOptionalPropertyTypes`, an optional property holding `undefined`.

## Capturing a value

`capture(given)`, in `src/value/capture.ts`, is the one function every point where something enters a journey calls: initial data, contributions, event data, a reason's details, global metadata, an adapter's value and a provider's data. It is not exported from the package. It returns a `Result` from `ts-results-es`: the copy, or why what was given is not a value, one of a closed set of problems, and where in it.

It walks what it is given once:

1. `null`, booleans and strings are kept; a number is kept when it is finite.
2. An object with a `toValue` method has it called, and what it returns is captured in its place, at any depth, so a list of a class that serialises itself becomes a list of plain data that `classOf(C)` inside `listOf` reads back.
3. A list is captured item by item when its prototype is `Array.prototype` and it has no empty slot and no other property.
4. An object is captured key by key when its prototype is `Object.prototype` or `null` and every key is an enumerable string; each property is read once, so a getter is called once and what it returned is kept.
5. Anything else is not a value: `undefined`, a function, a symbol, a `bigint`, `NaN`, the infinities, an object with any other prototype, such as a `Date`, a `Map` or an instance of a class, and an object that contains itself.

The copy is built as the walk goes, so it shares nothing with what was given, and a key named `__proto__` stays a key, as `JSON.parse` keeps it. An object reached twice without containing itself is accepted, and copied twice.

Anything thrown while capturing makes what was given not a value, at the place it was thrown, and the error is not kept:

- a `toValue()` that throws, as [spec#113](https://github.com/itinera-dev/spec/issues/113), approved by the maintainer, says of a conversion that fails at capture;
- a getter or a proxy that throws. The specification names no such case, and none is decided here beyond what it says: a value is data that can be serialised (chapter 1, 1.3), and data whose reading throws cannot be, so it is not a value, with the consequences chapter 4, 4.6 point 2 gives one.

A value nested more deeply than the call stack allows, over a thousand levels or so depending on where it is captured, cannot be walked, and is refused as not a value too.

### Why a walk of itinera's own

Decision 9 of the plan first chose `is-json-value` for the check, `structuredClone` for the copy and one rule of itinera's for prototypes. On 2026-10-19 the maintainer chose a walk of itinera's own instead, unless an npm package does all of it, because:

1. `toValue()` must be called at any depth, since `classOf(C)` reads a class back inside `listOf` and `objectOf`, which `is-json-value` cannot do, so a walk of itinera's own is needed anyway, and the prototype rule, which `is-json-value` lacks for objects with `toJSON` such as a `Date`, is another.
2. `is-json-value` and `structuredClone` each read every getter, so a getter is read twice, and what was checked may not be what is stored.
3. `is-json-value` is ESM only: Node 22.12 can `require` it, but Jest's CommonJS loader cannot, so it would have to be bundled into the CommonJS build, which today is `tsc` alone.

No npm package does all of it:

- `is-json-value` and `safe-json-value` check and copy JSON, but resolve `toJSON` rather than a method of the application's choosing, let a `Date` through, and are ESM only;
- cloners, such as `rfdc`, `klona`, `clone-deep`, `copy-anything` and `plain-object-clone`, and `structuredClone` itself, copy without refusing what is not plain data, and call no conversion;
- serialisers, such as `superjson`, `safe-stable-stringify` and `fast-safe-stringify`, make text or tagged JSON, which is not what is stored;
- Zod's `z.json()`, which arrives in stage 4, checks JSON-shaped data but calls no conversion.

Changing the walk changes `src/value/capture.ts` alone.

## Reading a value

`received(stored, schema)`, in `src/value/read.ts`, is the one function every read of a stored value calls: a step's input, an input adapter's request for data from the workflow, and `DataBag.read`. It is not exported from the package. It returns an `Option`:

1. It copies the stored value with `structuredClone`, which is enough for plain data, so each requester gets its own copy, sharing nothing with the data bag or with another requester.
2. It checks the copy with the schema through the Standard Schema interface. The requester gets the stored value, never what the schema makes of it, so a schema that coerces or transforms changes nothing.
3. Wherever `classOf(C)` appears, at the top or inside a Zod list, object, optional or nullable schema, it replaces the value there with what `C.fromValue` makes of it. Other properties of an object, and an optional property that is missing, are left as they are.
4. It gives nothing when the schema refuses the value, when the schema throws, when its check returns a promise or any other thenable, and when a `fromValue` throws. The caller turns nothing into `wrong type`, or `other type` for `DataBag.read`, carrying no error, as [spec#113](https://github.com/itinera-dev/spec/issues/113), approved by the maintainer, says of a conversion that fails while a value is read.

A check that returns a promise is asynchronous, which section 3 of the plan says cannot be used, and which a Standard Schema validator shows only when it runs. Stage 5 decided, for the maintainer to confirm, that it counts as a check that failed: the promise is never awaited, and its rejection is caught and dropped, so it is never an unhandled rejection. Zod also turns a throw inside a custom check into such a rejection.

## Dependencies

- **`ts-results-es`**, a runtime dependency, for `Result`, which `capture` returns. Decision 8 of the plan chose it: it uses Rust's names, has no dependencies of its own, and ships CommonJS and ESM builds with their types. itinera uses its `Result` only inside, never exporting it, and re-exports its `Option`, `Some` and `None` for applications.
- **`fast-check`**, a development dependency, for the property-based test.

## Tests

- `tests/unit/value/capture.test.ts`: every JSON value is captured as it is, a property-based test with fast-check; the copy shares nothing with what was given; a key named `__proto__` stays a key; an object without a prototype is accepted; a getter is read once; objects that serialise themselves are captured at any depth, and `toValue()` is called once, its result captured in turn; `toValue` is read once; an object reached twice is accepted; one named case for each kind of non-value, a revoked proxy included; a value nested too deeply; the path of the problem, and of a proxy or a getter that throws.
- `tests/unit/value/read.test.ts`: what each schema accepts given as it is, what it refuses, a schema that throws, one that checks asynchronously, a `fromValue` that refuses, a copy that shares nothing, the stored value rather than the schema's output, and `fromValue` wherever `classOf` names a class.
- `tests/unit/value.test-d.ts`: what `Value`, `PlainValue` and `AsValue` accept and refuse, one test each, run on TypeScript 6.0 and 5.5.

## Done when

Every scenario tagged `@proposal-0056` passes, and 56 is listed in `conformance.json`. Planned for stage 6.
