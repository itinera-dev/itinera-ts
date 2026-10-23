# 0062: Workflow descriptors, and executors independent of how workflows are written

Tech spec for [proposal 0062](https://github.com/itinera-dev/spec/blob/main/proposals/0062-workflow-descriptors.md), implemented in [#23](https://github.com/itinera-dev/itinera-ts/issues/23). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals: section 4 the decorators, section 5 the registration, the builder and the descriptors, and decisions 11 and 12. [0008](0008-steps.md) holds the steps and [0061](0061-instance-carries-journey-id-and-reporters.md) the instance.

Status: in progress. Stage 3 added the base class `Workflow`, the descriptor interfaces, the registry, `@workflow`, `@withStep` and `@idGenerator`, the metadata check, the first violation and the static `build()`. The builder comes next in stage 3; stage 4 adds every other list, every violation, the listing and `run`'s check of a descriptor written by hand, and lists the proposal.

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

## Dependencies

- **`reflect-metadata`** 0.2.2, a peer dependency that `src/declaration.ts` imports itself, so an application never has to import it first. It reads the parameter types the compiler records with `emitDecoratorMetadata`, which no part of the language or the platform reads. TypeScript's emitted code records them only when `Reflect.metadata` exists as the class is defined, which importing itinera's decorators guarantees.

## Tests

- `tests/unit/workflow/decorators.test.ts`: steps in written order, every refusal when a class is defined, the ID generator recorded as a reference to its method, refused on what is not a method, refused twice, refused with a parameter, and refused without metadata.
- `tests/unit/workflow/descriptor.test.ts`: no name, violations, steps kept whatever happens to the list given, new reporters on every call, a random UUID v4, the ID generator called on the workflow object, and an ID that is not a string.
- `tests/unit/workflow/violation.test.ts`: each repeated name once, in order, case-sensitive names, and the message.
- `tests/unit/workflow.test.ts`: `build()` with the constructor's arguments, one descriptor per class, a class without `@workflow`, and an object made with `new`.
- `tests/unit/declaration.test.ts`: the metadata check, and parameters counted from the metadata or from `length`.
- `tests/unit/workflow.test-d.ts`: `Built`, the arguments of `build()`, `Workflow.build()`, `instance()` on an object made with `new`, initial data or initial global metadata that is not a value, `@workflow` on a class not extending `Workflow`, a reporter class whose constructor takes arguments, `@withStep` with a class not extending `Step` or on a class not extending `Workflow`, and an ID generator returning a number, a promise, taking a parameter, or on a class not extending `Workflow`.
- `examples/workflow.ts`, `examples/descriptors.ts`, `examples/id-generator.ts` and `examples/violations.ts`.

## Open points

- **The step descriptor's builder** (decision 11, point 3). Stage 3 gives `@withStep` and the builder one options object, `StepOptions`, for the name, the retry budget and `noRetryOnAbnormalTermination`, to which stage 4 adds `needs`, `run`, `policies` and `rescue`, typed against the step class in one call, as the plan's `Orders.builder().step(Charge, { name: "charge", needs: [integer], run: [string] })` writes it. It takes the place of a separate builder object per step descriptor, which decision 11, point 3, and section 5, point 5.3, of the plan describe, a default the maintainer may change. It was taken because the plan also writes the options form, in decision 11, point 9, and section 5, point 5.4, and one object typed against the step class checks its tokens by position in one place. The question went to the maintainer.
- **Names for descriptors written by hand.** `WorkflowDescriptor`, `StepDescriptor` and `WorkflowInstance` may be written by hand, as chapter 5, 5.9 allows, but `WorkflowName`, `StepName` and `JourneyId` are branded, so such code needs a cast to make one. Public makers checked as `named` checks, like itinera-rs's `StepName::new`, `WorkflowName::from` and `JourneyId::from`, are settled before stage 4 adds `run`'s check of a descriptor written by hand.
- **The guard on `strictNullChecks`.** Section 4 of the plan, point 3, asks for a type-level guard that makes the decorators fail to compile without `strictNullChecks`. It lands in stage 4, with the request decorators, whose refusals are the ones that compile without it, together with a type test compiled with the option off.

## Done when

The builder's every list and check, every violation, the listing and `run`'s check of a descriptor written by hand are in, and 62 is listed in `conformance.json`. No scenario is tagged `@proposal-0062`. Planned for stage 4.
