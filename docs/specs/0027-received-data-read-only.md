# 0027: Data a step or hook receives is read-only

Tech spec for [proposal 0027](https://github.com/itinera-dev/spec/blob/main/proposals/0027-received-data-read-only.md), implemented in [#10](https://github.com/itinera-dev/itinera-ts/issues/10). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, and [0056](0056-data-bag-values.md) the values.

Status: complete, and 27 is listed in `conformance.json`. Stage 5 gave each step its own copy of every input and captured contributions when they are made, and stage 7 did the same for hooks and listed the proposal.

## How it holds

TypeScript cannot make a received value read-only in a way a cast cannot undo, and `Object.freeze` would turn a step that changes what it received into an abnormal termination. So every requester receives its own copy, and what it does to that copy changes nothing else, as chapter 4, 4.4 allows where a language cannot refuse the change:

- **Inputs and data from the workflow** are read through `requested`, in `src/engine/request.ts`, which hands each requester its own copy of the value, or an instance made by `fromValue` from one (see [0056](0056-data-bag-values.md)).
- **Data from the step** a hook requests with `@fromStep` is read the same way from what the attempt contributed, so a hook that changes it changes neither the contribution nor what another hook receives.
- **A failure's reason** a hook requests is a copy of the one the outcome carries, in `src/engine/hook/answer.ts`.
- **The error** a hook requests is its own copy of what the attempt threw, in `src/engine/hook/answer.ts`: an object with the same prototype and the thrown object's own properties, made as an `Error` when the thrown value is one, so that `instanceof`, its message, its stack and its cause hold, and a hook that changes it changes neither what another hook nor the result receives. `structuredClone` would keep only the standard error classes, and lose a subclass and its own properties. The properties are copied as they are defined, so a getter runs only when the hook reads it, and one that throws then fails the hook; only the stack is copied as its value, since the runtime's accessor would read the copy's. The copy is shallow: a property holding an object, such as a cause, is the thrown error's own. A thrown value that is not an object cannot be changed, and is given as it is, and so is an object that cannot be copied, such as a proxy whose traps throw, since nothing may escape `run`.
- **Contributions** are captured when `contribute` is called, by the handles in `src/engine/handles.ts`, so a step or hook that changes the object afterwards changes nothing committed.

The copy made when a value is captured runs the getters of what is given and a proxy's traps, and the copy made for each request for a value, or each read through an input adapter's access, calls no application code: [0121](0121-read-only-copies.md) says what each copy calls and what a copy that fails means.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/request.test.ts` and `tests/unit/engine/build.test.ts`: a copy for every requester.
- `tests/unit/engine/handles.test.ts`: a contribution captured when it is made.
- `tests/unit/engine/hook/answer.test.ts`: a hook's own copy of the step's data, of the reason and of the error.

## Done when

Done in stage 7: every scenario tagged `@proposal-0027` passes, and 27 is listed in `conformance.json`.
