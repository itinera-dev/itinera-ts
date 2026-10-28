# 0122: Custom code that returns an unexpected result

Tech spec for [proposal 0122](https://github.com/itinera-dev/spec/blob/main/proposals/0122-unexpected-results.md), implemented in [#83](https://github.com/itinera-dev/itinera-ts/issues/83). It amends [0054](0054-how-custom-code-fails.md), [0010](0010-hooks-lifecycles-and-roles.md) and [0009](0009-running-a-workflow.md). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals.

Status: complete, and 122 is listed in `conformance.json`, with the cases at `v0.1.0-rc.19`.

## The two shapes of call

Chapter 5, 5.10 point 6 asks for every call's shape:

1. **Void,** typed `void` or `Promise<void>`: `Reporter.report` and `receiveGlobalMetadata`, a dispatcher's `add`, `dispatch` and `setGlobalMetadata`, role operations, which the engine never calls itself, and the workflow hooks `on workflow success` and `on workflow failure`. A returned promise is awaited for its completion and its rejection; what it resolves to is never read.
2. **With a result:**
   1. a step's `run`, an `Outcome`, and a rescue step's, a rescue outcome;
   2. a step hook, `OnSuccess` or `OnFailure`, where nothing is `this.keepDefault()`;
   3. the constructor of a step, a rescue step or a policy, an object of its base class, `Step`, `RescueStep`, `StepPolicy` or `WorkflowPolicy`;
   4. `DispatcherFactory.create`, a `Dispatcher`;
   5. an input adapter, what `this.supply(...)` makes, where nothing is `this.fromDataBag()`. Its result is never a bare value, so a bare `null` returned is not the value `null` but an unexpected result; the value `null` is `this.supply(null)`;
   6. a service provider, what `this.provide(...)` makes. TypeScript has no form of nothing for it, as the proof for `no-instance` shows;
   7. the value conversions, which keep the meanings 5.10 gives them (see [0113](0113-value-conversions.md)).

Every call is awaited, so a promise is a result like any other once it settles.

## What happens to an unexpected result

The types refuse every unexpected result, so each of these happens only through a cast or `any`. The engine checks anyway, so that nothing escapes `run`.

| What custom code returns | Where it is checked | What follows |
|---|---|---|
| A step's or rescue step's `run`: what is not an outcome its helpers made | `src/engine/run.ts`, after its handles close | the abort `unexpected result`, naming the step, never retried |
| A step hook: `undefined`, `null`, a string, an object of an unknown `kind`, or `FailWorkflow` without a valid reason | `lifecycleOf`, in `src/engine/hook/lifecycle.ts` | the abort `unexpected result`, naming the step, the policy and the hook |
| A failure hook: `FinishWorkflow` | the same | the abort `invalid lifecycle`, naming the step, as before |
| A workflow hook: anything | not read | nothing |
| An input adapter: what neither helper made | `src/engine/adapter.ts` | the abort `unexpected result`, naming the step, the adapter and the key, with no `input_adapter_failed` |
| A service provider, or a test's fake provider: what `this.provide(...)` did not make, `undefined` included | `src/engine/provider.ts` | the abort `unexpected result`, naming the step, the provider and the key, with no `service_provider_failed` |
| The constructor of a step or rescue step: another object | `isBuilt`, in `src/engine/buildable.ts`, through `isOf` | the abort `unexpected result`, naming the step |
| The constructor of a step policy: another object | `src/engine/policies.ts`, through `isOf` | the abort `unexpected result`, naming the step and the policy |
| The constructor of a workflow policy: another object | the same | `run` is refused, with the kind `unexpected result`, naming the policy |
| The dispatcher factory: what is not a dispatcher | `src/engine/start.ts`: an object with the three methods | `run` is refused, with the kind `unexpected result`, naming the dispatcher factory |
| The ID generator: what is not a string, or an empty string | `generateJourneyId`, in `src/workflow/descriptor.ts` | `instance()` throws a `TypeError`: no journey, no event |

A JavaScript constructor called with `new` never gives a null-like value, since a primitive it returns is ignored. So the only unexpected result a constructor can give is another object: one that is not an object of the base class, as `instanceof` says. `isOf`, in `src/engine/returned.ts`, asks it, and takes an object for which asking throws, such as a revoked proxy, for another object, since nothing may escape `run`.

## API

- **`AbortReason.UnexpectedResult`**, `"unexpected result"`, in `itinera/journey`.
- **`UnexpectedResult`**, in `itinera/event`, `src/event/abort/unexpected-result.ts`, a member of `JourneyAbort`: the `step`, a `source` that is the step itself, a step hook, an adapter with its key, a provider with its key (`ByProviderForKey`) or a policy (`ByPolicy`), and a `message` saying what was returned and by whom, such as "step charge returned undefined, not an outcome made with its helpers". DECIDED (the maintainer, 2026-10-27): it is a `message`, not `errorMessage`, which says something threw, and the abort carries no `error`, both in `journey_aborted` and in the result. Conformance does not check the text.
- **`UnexpectedResultReturned`**, in `itinera/executor`, a kind of `Refused`, `"unexpected result"`, whose `source` is the dispatcher factory or a workflow policy, with its `message`, which the `Refusal`'s own message repeats.
- **`InvalidLifecycle.step`** is now always there, since only a step hook can return a lifecycle it may not.
- **`whatIs(returned)`**, private, in `src/engine/returned.ts`, says what was returned for the messages: `null`, `undefined`, `an object` or the article and the `typeof`, as the ID generator's `TypeError` does too.

## Rules made impossible

DECIDED (the maintainer, 2026-10-27): `unexpected-result` and `non-string-journey-id` are claimed impossible to express, since whatever TypeScript can refuse does not compile. Each scenario that carries them is listed under `impossible` in `conformance.json` with its proof, a named test in `packages/itinera/tests/integration/proofs.test-d.ts`:

- "a step's run cannot return anything but an outcome";
- "a rescue step's run cannot return anything but a rescue outcome";
- "a step hook cannot return anything but keepDefault() or a lifecycle";
- "an input adapter cannot return anything but what supply() or fromDataBag() make";
- "a service provider cannot return a null-like value";
- "a step's constructor cannot return anything but the step";
- "a policy's constructor cannot return anything but the policy";
- "an ID generator cannot return anything but a string".

The engine keeps the checks of the table for what a cast lets through, as it does for `invalid-lifecycle`. The scenarios that run are those of `empty-journey-id`, which types cannot refuse, the input adapter that supplies the value `null`, and the three about workflow hooks.

## The runner

- "the hook ... of policy ... returns a value", used only for a workflow hook, returns nothing, since TypeScript refuses a workflow hook that returns a value, as STEPS.md allows.
- "the hook ... of policy ... is asynchronous" only checks that the policy has the hook, since every hook of a policy mock is already an asynchronous method. So policy mocks need no `asynchronous` option.
- "Then creating the workflow instance failed" checks that making an instance threw a `TypeError`, which stops the scenario's journeys, in `packages/conformance/src/journeys.ts`.

## Dependencies

None of its own.

## Tests

- `tests/unit/engine/run.test.ts`: what is not an outcome, aborted and never retried, from a step and from a rescue step.
- `tests/unit/engine/hook/lifecycle.test.ts`: every unexpected result of a step hook, its message, and a workflow hook's return never read.
- `tests/unit/engine/adapter.test.ts` and `tests/unit/engine/provider.test.ts`: `undefined`, `null` and a bare value, with no event.
- `tests/unit/engine/build.test.ts` and `tests/unit/engine/policies.test.ts`: constructors of a step, a rescue step and both kinds of policy that return another object or a revoked proxy.
- `tests/unit/engine/start.test.ts`: dispatcher factories that return what is not a dispatcher.
- `tests/unit/workflow/descriptor.test.ts`: an empty journey ID.
- `tests/unit/executor/refusal.test.ts` and `tests/unit/engine/returned.test.ts`: the refusal's message, what was returned, and `isOf` on proxies that throw.

## Done when

Done: every scenario tagged `@proposal-0122` passes, but those excluded with their proofs, and 122 is listed in `conformance.json`.
