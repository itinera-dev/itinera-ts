# 0062: Workflow descriptors, and executors independent of how workflows are written

Tech spec for [proposal 0062](https://github.com/itinera-dev/spec/blob/main/proposals/0062-workflow-descriptors.md), implemented in [#23](https://github.com/itinera-dev/itinera-ts/issues/23). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals: section 4 the decorators, section 5 the registration, the builder and the descriptors, and decisions 11 and 12. [0008](0008-steps.md) holds the steps and [0061](0061-instance-carries-journey-id-and-reporters.md) the instance.

Status: in progress. Stage 3 added the base class `Workflow`, the descriptor interfaces, the registry, `@workflow`, `@withStep` and `@idGenerator`, the metadata check, the first violation, the static `build()` and the builder with `name`, `step`, `reporter`, `idGenerator`, `constructWith` and `build`. Stage 4 adds every other list, the tokens by position, every violation, the listing and `run`'s check of a descriptor written by hand, and lists the proposal.

## API

Until 0062 is listed, everything here is exported only from `itinera/unstable`. The base class is defined in `src/workflow.ts`, which becomes the subpath `itinera/workflow` then, with its submodules in `src/workflow/`.

### The descriptors, the executor's contract

- **`WorkflowDescriptor<W>`**, in `src/workflow/descriptor.ts`, is an object of its own, never the workflow object, as decision 12 says. `W` is the type of the workflow object its calls take. Its members so far:
  - `name`, the `WorkflowName`;
  - `steps()`, the step descriptors in the order they run, the same frozen array on every call;
  - `reporters()`, a new reporter of each listed class for every call, which `instance()` calls when it creates an instance, so that each instance has reporters of its own;
  - `generateJourneyId(workflow, data)`, which calls the method `@idGenerator` marked with the workflow object as `this`, or makes a random UUID v4 with `crypto.randomUUID()` when there is none. `data` is the instance's initial data, which the method reads once `@dataBag()` arrives, in stage 4; the parameter is there now so that the executor's contract does not change then. A returned value that is not a string throws a `TypeError`, since a cast can slip one past the types.
- **`StepDescriptor`**, in `src/step/descriptor.ts`: `name`, `retryBudget`, `retryOnAbnormalTermination` and `build()`, which makes a new step for each attempt. Its requests join it in stage 4.
- Stage 4 adds `policies()`, `adapt(...)`, `provide(...)` and `listing()`, and `PolicyDescriptor`.

### How declarations become descriptors

- **The registry**, in `src/workflow/registry.ts`, keeps a `Declaration` per workflow class in a `WeakMap`: its name, its step descriptors, its reporter classes, its ID generator and, once `@workflow` made it, its descriptor. It is never exported, and nothing is added to the class.
- **`@withStep(Step, options)`** checks that the step class was declared with `@step`, makes its step descriptor at once, which checks its name and retry budget, and puts it first in the list. Class decorators run from the bottom up, so putting each first leaves the list in written order, and `@workflow` has nothing to reorder.
- **`@idGenerator()`** records the method it marks, a reference to `Orders.prototype.orderId`, never its name. Its decorator is generic in the method's type, as the plan's note 1 says, and is typed as the interface `IdGeneratorDecorator`, so that its type parameter has documentation.
- **`@workflow({ name, reporters })`**, on the top line, runs last. It records the name and the reporter classes, then makes the descriptor with `assemble`, which checks every violation it knows and throws `Violations`, and keeps it in the registry. The name is required: a class without `@workflow` is named by the builder's `name()`, and the builder's `build()` throws when neither named it.
- **Checked when the class is defined**, throwing an `Error` that says what is wrong: a name that is empty, a retry budget that is not a whole number from 0, a class that does not extend `Workflow` itself, `@workflow` twice on one class, `@withStep` written above `@workflow`, a step class not declared with `@step`, `@idGenerator` on what is not a method, two ID generators, and a parameter of the ID generator with no request.
- **The metadata check**, in `src/declaration.ts`, which imports `reflect-metadata`: a method decorator throws when the compiler recorded no `design:paramtypes` for its method, naming the compiler option `emitDecoratorMetadata`. Parameters are counted from those types, or from the function's `length` where none were recorded, as for a `run` with no decorated parameter. Until stage 4 adds the request decorators, any parameter is a parameter with no request.

### Violations

`Violations`, in `src/workflow/violation.ts`, is an `Error` holding every violation found, at least one, with one line of its message per violation, such as `duplicate step name: charge`. Each `Violation` is a member of a discriminated union on `kind`, whose values are the closed set `ViolationKind`, written as chapter 3, 3.6 names them. Stage 3 finds `duplicate step name`, naming each repeated name once, in the order found; stage 4 adds the others.

### The base class and `build()`

- **`Workflow`** is abstract. Its constructor takes nothing and does nothing. It keeps its descriptor in the ECMAScript private field `#descriptor`, set only by the private method `#init(descriptor)`.
- **`Orders.build(...args)`**, typed `this: C` with `C extends new (...args: never[]) => Workflow`, takes the descriptor `@workflow` made, calls `new this(...args)`, checked as `ConstructorParameters<C>`, then `#init`. It returns `Built<InstanceType<C>>`, the object marked by a `unique symbol` the module never exports. `Workflow.build()` does not compile, since `Workflow` is abstract, and a class without `@workflow` throws, saying it has no descriptor to build from.
- **`instance()`** takes `this: Built<this>`, so it does not compile on an object made with `new`, and throws, saying to use `build()`, when a cast gets one past the compiler. What it makes is in [0061](0061-instance-carries-journey-id-and-reporters.md).

### The builder

`WorkflowBuilder<C, Ready>`, in `src/workflow/builder.ts`, is exported as a type only, so an application gets one from `Orders.builder()`, a static method of `Workflow` typed `this: C` as `build()` is.

- **It starts from the class's declaration**: the name, the step descriptors, the reporter classes and the ID generator the decorators recorded, copied, so what it adds never changes the class's own descriptor. A class without decorators starts from nothing.
- **What it adds**, each method returning the builder: `name(name)`, in place of the name `@workflow` gave, checked not to be empty at once; `step(Step, options)`, a step descriptor made at once from the same `StepOptions` as `@withStep`'s; `reporter(Reporter)`, a reporter class; and `idGenerator(key)`, the name of a method of the class, typed `IdGeneratorKey<InstanceType<C>>`, the keys of the methods that take nothing and return a string, whose method it records. A name keeps it safe from a minifier, which leaves property names alone, and lets the compiler check it against the class.
- **Classes, not decorators.** `step` takes any class extending `Step`, declared with `@step` or not, and also one extending another step class, as test support's mocks made per scenario will (see [0108](0108-test-support.md)); only `@step` requires a class to extend `Step` itself. A step's parameters are checked as `@step` checks them, at once.
- **`constructWith(...args)`**, typed `ConstructorParameters<C>`, keeps the arguments and returns the builder typed `WorkflowBuilder<C, true>`.
- **`Ready`** is a phantom type parameter, `true` when `[] extends ConstructorParameters<C>`, so for a class whose constructor needs an argument `build()`, typed `this: WorkflowBuilder<C, true>`, does not compile until `constructWith` was called, while a class whose constructor needs none builds straight away.
- **`build()`** makes a new descriptor with `assemble`, which throws `Violations` or an error when the workflow has no name, before the constructor runs, then calls `new C(...args)` and gives the object its descriptor. It reaches `#init` through a function `Workflow.builder()` hands the builder's constructor, written inside `Workflow`, so only `Workflow`'s own code can write it; `WorkflowBuilder` is exported as a type only, so no application can make a builder with a function of its own. Every `build()` makes a new descriptor and a new object.
- **Only a class extending `Workflow` itself** has a builder, as only such a class may be declared: `builder()` on a class extending another workflow class throws, since what the parent declared would not carry over, and inheriting declarations can then come later without breaking anything.
- **The step options.** `StepOptions`, one object shared with `@withStep`, takes the place of a separate builder object per step descriptor, which decision 11, point 3, and section 5, point 5.3, of the plan describe, a default the maintainer may change. Stage 4 adds `needs`, `run`, `policies` and `rescue` to it, typed against the step class in one call, as the plan's `Orders.builder().step(Charge, { name: "charge", needs: [integer], run: [string] })`, in decision 11, point 9, and section 5, point 5.4, writes it, so one object checks the tokens by position in one place. The question went to the maintainer.
- **When it refuses.** A misuse of a builder method throws at once, from that method, as the decorators throw when the class is defined, so the error points at the line that is wrong: an empty name, a step's empty name, retry budget or parameter with no request, an ID generator that is not a method of the class, and a second ID generator. These are misuses, not violations of chapter 3, 3.6, which `build()` still collects whole and throws together as `Violations`. The plan's table of checks put every check at `build()`; this is a default the maintainer may change.
- **Refused**: at compile time, `Workflow.builder()`, a step class not extending `Step`, a reporter class whose constructor takes arguments, the name of a method that takes a parameter or does not return a string, or of a field whose type is not such a method, arguments that do not match the constructor, and `build()` before `constructWith` when the constructor needs arguments; at once, the misuses above, a field holding a function named as ID generator, which the types cannot tell from a method, and a class extending another workflow class.

## Dependencies

- **`reflect-metadata`** 0.2.2, a peer dependency that `src/declaration.ts` imports itself, so an application never has to import it first. It reads the parameter types the compiler records with `emitDecoratorMetadata`, which no part of the language or the platform reads. TypeScript's emitted code records them only when `Reflect.metadata` exists as the class is defined, which importing itinera's decorators guarantees.

## Tests

- `tests/unit/workflow/decorators.test.ts`: steps in written order, every refusal when a class is defined, the ID generator recorded as a reference to its method, refused on what is not a method, refused twice, refused with a parameter, and refused without metadata.
- `tests/unit/workflow/descriptor.test.ts`: no name, violations, steps kept whatever happens to the list given, new reporters on every call, a random UUID v4, the ID generator called on the workflow object, and an ID that is not a string.
- `tests/unit/workflow/violation.test.ts`: each repeated name once, in order, case-sensitive names, and the message.
- `tests/unit/workflow.test.ts`: `build()` with the constructor's arguments, one descriptor per class, a class without `@workflow`, and an object made with `new`.
- `tests/unit/workflow/builder.test.ts`: a workflow put together without decorators, one starting from its decorators and adding to them while leaving them as they were, the name replaced, a new descriptor at every build, steps not declared with `@step` or extending another step, and every refusal, a field holding a function named as ID generator and a class extending another workflow class included, violations before the constructor runs.
- `tests/unit/workflow/builder.test-d.ts`: what `build()` returns, `build()` before `constructWith`, a constructor that needs no argument, the constructor's arguments, `Workflow.builder()`, a step class and a reporter class that do not fit, and `IdGeneratorKey`.
- `tests/unit/declaration.test.ts`: the metadata check, and parameters counted from the metadata or from `length`.
- `tests/unit/workflow.test-d.ts`: `Built`, the arguments of `build()`, `Workflow.build()`, `instance()` on an object made with `new`, initial data or initial global metadata that is not a value, `@workflow` on a class not extending `Workflow`, a reporter class whose constructor takes arguments, `@withStep` with a class not extending `Step` or on a class not extending `Workflow`, and an ID generator returning a number, a promise, taking a parameter, or on a class not extending `Workflow`.
- `examples/workflow.ts`, `examples/descriptors.ts`, `examples/id-generator.ts`, `examples/violations.ts` and `examples/builder.ts`.

## Open points

- **Names for descriptors written by hand.** `WorkflowDescriptor`, `StepDescriptor` and `WorkflowInstance` may be written by hand, as chapter 5, 5.9 allows, but `WorkflowName`, `StepName` and `JourneyId` are branded, so such code needs a cast to make one. Public makers checked as `named` checks, like itinera-rs's `StepName::new`, `WorkflowName::from` and `JourneyId::from`, are settled before stage 4 adds `run`'s check of a descriptor written by hand.
- **The guard on `strictNullChecks`.** Section 4 of the plan, point 3, asks for a type-level guard that makes the decorators fail to compile without `strictNullChecks`. It lands in stage 4, with the request decorators, whose refusals are the ones that compile without it, together with a type test compiled with the option off.

## Done when

The builder's every list and check, every violation, the listing and `run`'s check of a descriptor written by hand are in, and 62 is listed in `conformance.json`. No scenario is tagged `@proposal-0062`. Planned for stage 4.
