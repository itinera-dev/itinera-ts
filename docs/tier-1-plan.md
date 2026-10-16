# itinera-ts: tier 1 plan

A general plan for implementing tier 1 of the Itinera specification in TypeScript, in this repository, itinera-dev/itinera-ts. Every decision listed under "Decisions" was taken with the maintainer on 2026-10-15 and 2026-10-16. Stage 0 brought this file into the repository, as itinera-rs has its own.

Behaviour comes only from the [specification](https://github.com/itinera-dev/spec/tree/main/spec). Where this plan and the specification disagree, the specification is right. Code samples show the intended shape only; the tech specs record the final names.

## What this plan implements

- **Specification 0.1.0, tier 1**, checked by the conformance cases at **`v0.1.0-rc.15`**, the newest candidate (tagged 2026-10-14; the conformance `main` branch has nothing after it). That is 61 features and 317 scenarios.
- **The proposals**, the same 35 itinera-rs lists: 0002, 0003, 0008, 0009, 0010, 0011, 0012, 0024, 0027, 0032, 0040, 0041, 0042, 0049, 0054, 0055, 0056, 0057, 0058, 0060, 0061, 0062, 0063, 0064, 0065, 0081, 0083, 0085, 0091, 0095, 0098, 0102, 0104 and 0106, which make up tier 1, and 0108, test support, which counts towards no tier and is listed only because this plan claims `testing`. Proposal 0111 has no cases: its suggested names are simply the names this plan uses, in camelCase.
- **Capabilities claimed:** `async` and `testing` (decision 1). The two `@capability-sync` scenarios do not run.
- **Rules made impossible to express:** five of the nine a conformance tag lets a language exclude, by TypeScript's types, each with a proof that the type check fails on. Three more are enforced at run time or when a class is defined, and their scenarios run, as do those of test support's two; the ninth, `mode-not-accepted`, does not arise (see "Rules made impossible, and rules enforced at run time").
- **When the cases move.** When the specification and conformance are tagged `v0.1.0`, once itinera-rs closes tier 1, a pull request moves `cases` to `v0.1.0`; any case changed after rc.15 gets a `spec update` issue, as PROCESS.md says.

## What carries over from Rust, and what does not

itinera-rs settled many questions that are not about Rust. This plan keeps those answers and changes only what TypeScript does differently.

| Rust's answer | In TypeScript |
|---|---|
| Macros are the API applications write, expanding to a public builder | Classes extending itinera's base classes, marked with decorators as close to the macros as the language allows, are the only way to declare; there is no builder (section 4, decision 2) |
| Traits and generated code tie the parts together | Abstract base classes, `Workflow`, `Step`, `RescueStep`, `StepPolicy` and `WorkflowPolicy`, which applications extend; they implement the interfaces the executor uses, reading what the decorators recorded (section 5) |
| The macro API was designed late, in stage 8 | The decorator API is designed in this plan, and each stage lands the decorators of what it adds |
| Nine rules made impossible by types, each proven by a compile-fail test | TypeScript, not JavaScript, is what itinera-ts supports, so whatever the types can refuse does not compile: five of the nine rules, each proven by a type test. Three are enforced at run time or when a class is defined, and their scenarios run; `mode-not-accepted` does not arise |
| One engine written as asynchronous code, driven synchronously with a waker that does nothing | One asynchronous engine. A promise cannot be driven synchronously, so a synchronous executor would need the engine written as generators (decision 1) |
| Values are `Serialize + Clone`; every receiver gets its own clone | Values are plain JSON data, or instances of classes that serialise themselves, turned into plain data when captured; every receiver gets its own copy (decision 5) |
| Reads name a Rust type; any other type is `wrong type` | Types are erased, so each request's type comes from the decorator metadata where it is unambiguous, and is written as a token or a schema elsewhere (decision 3) |
| Step statuses are private; the runner derives them from the events | The same |
| Decision logic is a pure function; the engine calls hooks around it | The same |
| One emitter assigns sequence numbers and timestamps, with a replaceable clock | The same |
| Guards around each reporter keep the failure rules whatever the dispatcher | The same |
| `Interrupted`, the executor's own signal, ends a step at its emit call | An executor-owned error class, never exported, thrown from the emit call |
| `&mut self` makes concurrent journeys impossible to write | A run-time refusal when `run` is called while a journey runs, or with an instance that already ran |
| Panics are never caught | JavaScript has no unrecoverable failure that code can tell apart, so every throw is a recoverable failure and is caught |
| Conventional Commits with changelog trailers, git-cliff, merge commits, stacks per stage, a reviewer agent on every change | The same, from the first commit |

The four "Notes for other languages" at the end of the Rust plan all apply: a step's reporter is a small per-attempt object holding the dispatcher privately; the executor records the abort before throwing into a step, with the error class unexported; adapters may be found by reflection, which this plan does not need since decorators record them; and policies are rebuilt per attempt and per journey to keep hooks stateless.

## Architecture

### 1. Repository and packages

- **One published package, `itinera`**, the name free on npm today. It is one CommonJS build with a thin ESM layer that only re-exports it, so `import` and `require` both work, Jest included, and an application never loads two copies (the maintainer, 2026-10-16). It ships its own type declarations, and depends on `ts-results-es`, whose `Option` and `Result` it re-exports from `itinera/result` (decision 8), `ts-pattern` and `enum-plus` (decision 10), and `is-json-value`, bundled into the build (decision 9), with `reflect-metadata` as a peer dependency it imports itself (section 4). It has one subpath per concept, mirroring Rust's modules, as in `import { step, input } from "itinera/step"` for Rust's `use itinera::step::{step, input}` (decision 4). Test support is the subpath `itinera/testing`, so an application reaches it only when it imports it, as chapter 8, 8.1 point 2 asks; Rust puts it behind a feature in each concept's module, which a package cannot do.
- **An npm workspace** under `packages/`:

  | Package | Published | Holds |
  |---|---|---|
  | `itinera` | yes | Values and the data bag, events, reporters and dispatchers, the base classes and their decorators, the descriptors, the instance, the engine and the executor; `itinera/testing` |
  | `conformance` | no | The conformance runner, with its fixtures |

- **Runtimes.** The package uses only the language and the web platform's standard objects, such as `crypto.randomUUID`, never `node:` modules, so it runs on Node, Deno and Bun, and in browsers through a bundler, since the build is CommonJS. `reflect-metadata` adds a global polyfill. In a browser, `crypto.randomUUID` exists only in secure contexts, so the default journey ID needs one there, and the documentation says so. CI tests it on the supported Node versions only, Node 22 and later, and says so.
- **Modules follow concepts**, named with the specification's vocabulary, as in Rust: `error`, `value`, `journey`, `step`, `policy`, `event`, `report`, `service`, `workflow`, `instance` and `executor`, each a subpath, plus `testing`, and the private `engine`, which is never exported. As Rust's crate root exports modules, not types, the package root exports nothing of its own.

### 2. Values and the data bag

- **A value** is plain JSON data: `null`, a boolean, a finite number, a string, an array of values, or a plain object (whose prototype is `Object.prototype` or `null`) with string keys. `undefined`, functions, symbols, `bigint`, `NaN` and the infinities, class instances, `Date`, `Map` and cycles are not values (decision 5).
- **A class that serialises itself** can be given wherever a value is expected: an instance with `toValue()`, whose class has a static `fromValue(value)`. It is turned into plain data once, by `toValue()`, when it is captured, so the data bag, events, reasons and global metadata hold only plain data. `fromValue` runs only for a request whose type is the class, named with `classOf` or supplied by the metadata, which gives the step an instance again. This is what Rust's `Serialize + DeserializeOwned` bound asks, made visible at run time.
- **One function captures a value**, at every point where something enters a journey: initial data, contributions, event data, a reason's details, global metadata, an adapter's value and a provider's data. It calls `toValue()` on any class that serialises itself, checks that the result is a value, and makes the copy that is stored, keeping a key named `__proto__` as a key, as `JSON.parse` does. It checks with `is-json-value`, which reports each problem with its path, adds one rule of itinera's refusing objects whose prototype is not plain, such as a `Date`, and copies with `structuredClone` (decision 9). A getter is read once, and what it returned is stored.
- **What follows when it is not a value** is the specification's, where a language can express it:
  - a contribution, event data, a reason's details, global metadata set while the journey runs, and a provider's data abort the journey with `not a value`;
  - an adapter's value emits `input_adapter_failed` and aborts with `step could not be built` (chapter 4, 4.2 point 3.1);
  - initial data, and initial global metadata that is not a value or sets `journey_id`, are refused by `run`, listing each key. The one exception: a property of a plain object of initial data set to `undefined` is left out, as `#[derive(InitialData)]` leaves out a `None` in Rust.
  - A `toValue()` that throws, or returns what is not a value, counts as giving a non-value, with the consequence above for where it was given.
- **Read-only when received.** Every input, data from the step or from the workflow and reason given to a receiver is its own copy, so changing it in place changes nothing else. Copies, not frozen objects: assigning to a frozen object throws in strict mode, which would turn a harmless change into an abnormal termination.
- **Types refuse what they can.** Wherever a value is expected, its type is `Value`, plain JSON data or `{ toValue(): Value }`, so functions, `undefined`, symbols, `bigint`, `Date`, `Map` and other objects with methods do not compile there. Types cannot refuse `NaN`, the infinities or cycles, so the run-time check stays, and the `non-value` scenarios run.
- **Absence is `None`.** An optional request gives an `Option`: `Some(value)` when present, a stored `null` included, and `None` only when absent, so the two can never be confused (decision 8).
- **The data bag** maps string keys to values and keeps keys in the order they were first set. A typed read, `data.read(key, type)`, returns a `Read`, as Rust's does: present with the value, absent, or of another type, as chapter 4, 4.2 point 8.3 requires an adapter to be told; `read.option()` turns it into an `Option` when the difference between absent and another type does not matter. The data bag is a `Map`, as is global metadata, because a plain object moves keys that look like integers to the front, which would break "in the order first set" (chapter 2, 2.11 point 6) and the keys `journey_started` lists. Initial data and initial global metadata are accepted as a `Map`, as entries or as a plain object, and the documentation warns that a plain object reorders such keys.

### 3. Requests and their types

TypeScript's types disappear at run time, so the engine checks every value against a run-time description of the type its request asks for, and the compiler checks that description against the parameter's declared type (decision 3). Each request gets it in one of three ways:

1. **From the metadata**, when the request writes no type. A request with no type compiles only when the parameter's declared type is exactly `number`, `string` or `boolean`, or a class with a static `fromValue`, never a union, a literal type, an enum or a branded type, which the metadata would record as a plain `Number` or `String`. `@input("amount") amount: number` checks for a number.
2. **From one of itinera's type tokens**, written in the request, needed wherever the metadata records only `Object`, such as an interface, a union or an optional, or to narrow `number` to `integer`:
   - the neutral vocabulary of the cases, `string`, `integer`, `number`, `boolean`, `list` and `object`, where `integer` means `Number.isInteger` and `number` any finite number;
   - `optional(token)`, `listOf(token)` and `objectOf({ ... })` for shapes;
   - `classOf(C)` for a class whose static `fromValue(value)` makes an instance from a value and whose `toValue()` makes a value from an instance, so that a step can contribute and receive a `Payment` with its methods while the data bag holds plain data;
   - `guard(name, isT)`, for an application's own check written as a type guard.
3. **From a Standard Schema validator**, such as a Zod, Valibot or ArkType schema, written in the request in place of a token. The compiler checks the parameter against the schema's input type, and the schema only checks: the step receives the stored value itself, never the schema's output, so a schema that coerces cannot turn a `wrong type` into a silent conversion. A schema whose check is asynchronous is refused when its class is defined, since a read is synchronous.

A `fromValue`, a guard or a schema that refuses a value, or throws, makes the read `wrong type`, with no error, as a failing `Deserialize` does in Rust. These are calls into custom code that chapter 5, 5.10 does not list, which is raised with the maintainer as a possible gap in the specification before stage 5.

A request that writes no type where the metadata records `Object` or `undefined`, as a circular import gives, or where there is no metadata, throws when its class is defined, naming the parameter. A value that fails its check is `wrong type`, whether the request is required or optional, as chapters 4 and 6 say. The suggested names of chapter 4, 4.11 point 2 follow: a required request gives the value, an optional one an `Option` of it.

Writing no type at all, with every type read from the declarations, needs a build tool that reads the source with the TypeScript compiler: decorators cannot, and TypeScript 7 runs no compiler plugins. A generator, `itinera generate`, writing the tokens of every request that lacks one into a file of plain TypeScript, is left for after tier 1; it changes no decorator.

### 4. The public API: base classes and decorators

Decided with the maintainer (decisions 2 and 7, 2026-10-15 and 2026-10-16):

- Decorators are the API applications write, as close to Rust's macros as TypeScript allows, giving way to another form only where the language makes one impossible.
- TypeScript, not JavaScript, is what itinera-ts supports, so whatever TypeScript can refuse does not compile.
- The design is object-oriented: applications extend abstract base classes, and the executor uses interfaces those classes implement.
- There is no builder. Classes are the only way to declare, for applications and for the conformance runner alike.
- The decorators are TypeScript's legacy decorators, which applications turn on with `experimentalDecorators`, as NestJS, TypeORM and Angular projects already do, with parameter decorators. `emitDecoratorMetadata` is required, and supplies the type of a request that writes none (section 3).

The whole surface is planned here, and each stage lands the decorators of what it adds (section 17).

#### What a decorator can do, compared with a macro

A Rust macro generates code when the program compiles. A TypeScript decorator generates nothing: it is a function that runs once, when its class is defined, which is when its module is first imported. A legacy decorator can mark a class, a method or a parameter and record what it declares. It cannot add a member to the class's type or see a parameter's name.

What a decorator cannot do, a base class does: it gives every subclass members on its type. So the two share the work:

1. **The base classes** give each subclass what Rust's macros generate: `this.succeed()` and `this.fail(reason)` on a step, `this.keepDefault()` on a step policy, `this.supply(value)` and `this.provide(service)` on a workflow, and `instance(...)` on a workflow, as `Orders::builder()` in Rust. A base class cannot be constructed, so every step, policy and workflow is a subclass.
2. **The decorators record**, and the class decorator checks what spans several members, throwing `Violations` when the class is defined: the counterpart of a macro's compile error, caught by any test that imports the module.
3. **What the types check, does not compile when wrong.** A legacy class decorator sees its class's type, and a legacy method decorator sees its method's type, so most mistakes are compile errors (section 5). A legacy parameter decorator sees its class, its method and its parameter's position, so it is typed against the parameter's declared type: a parameter whose type does not match its request does not compile (section 5).

#### The orders example of itinera-rs, in TypeScript

The same workflow as `crates/itinera/examples/orders.rs`, to show how close the two are. Names and modules follow Rust's, in camelCase.

```ts
import { type Contributor, contributor, type DataBag, dataBag, type JourneyId, journeyId } from "itinera/journey";
import { fromStep, onStepSuccess, onWorkflowSuccess, type OnSuccess, role, StepPolicy, stepPolicy, WorkflowPolicy, workflowPolicy } from "itinera/policy";
import type { Event } from "itinera/event";
import type { Reporter } from "itinera/report";
import { type Provided, provider, service, serviceType } from "itinera/service";
import { type Attempt, attempt, input, type Outcome, Step, step } from "itinera/step";
import { integer, optional, string } from "itinera/value";
import type { Option } from "itinera/result";
import { fromWorkflow, idGenerator, inputAdapter, type Supplied, withStep, Workflow, workflow } from "itinera/workflow";
import { LocalExecutor } from "itinera/executor";

/** Takes payments: the service a charge is paid through. */
interface PaymentGateway {
  take(amount: number): string;
}
const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

/** The shop's card terminal, lent to one attempt to charge. */
class Terminal implements PaymentGateway {
  constructor(private readonly shop: string, private readonly attempt: Attempt) {}
  take(amount: number): string {
    return `${amount} paid at the ${this.shop} terminal, attempt ${this.attempt}`;
  }
}

/** Charges the amount the workflow's pricing works out. A charge of nothing is declined. */
@step()
class Charge extends Step {
  constructor(@input("amount", integer) private readonly amount: number) {
    super();
  }

  run(@service("payments", PAYMENT_GATEWAY) payments: PaymentGateway, @contributor() contributor: Contributor): Outcome {
    if (this.amount <= 0) return this.fail("declined");
    contributor.contribute("payment", payments.take(this.amount));
    contributor.contribute("charged", this.amount);
    return this.succeed();
  }
}

/** Ships the order. */
@step()
class Ship extends Step {
  run(): Outcome {
    return this.succeed();
  }
}

/** Notes each amount charged. */
@stepPolicy({ name: "audit" })
class Audit extends StepPolicy {
  @onStepSuccess()
  audited(@fromStep("charged", integer) charged: number, @contributor() contributor: Contributor): OnSuccess {
    contributor.contribute("audit", `charged ${charged}`);
    return this.keepDefault();
  }
}

/** A role the shop provides: telling a customer something. */
interface Messages {
  tell(message: string): void;
}

/** Tells the customer once the order is paid and shipped. */
@workflowPolicy({ name: "notify" })
class Notify extends WorkflowPolicy<Messages> {
  @onWorkflowSuccess()
  paid(
    @journeyId() id: JourneyId,
    @fromWorkflow("charged", integer) charged: number,
    @fromWorkflow("payment") payment: string,
    @role<Messages>() messages: Messages,
  ): void {
    messages.tell(`order ${id}: paid ${charged}, ${payment}`);
  }
}

/** Prints each event of every journey. */
class Printer implements Reporter {
  report(event: Event): void {
    console.log(event.journeyId, event.kind);
  }
}

@workflow({ name: "orders", policies: [Notify], reporters: [Printer] })
@withStep(Charge, { name: "charge", retryBudget: 1, policies: [Audit] })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow implements Messages {
  constructor(private readonly shop: string) {
    super();
  }

  tell(message: string): void {
    console.log(`${this.shop}: ${message}`);
  }

  /** Works out the amount to charge: the price, less any discount. */
  @inputAdapter({ steps: ["charge"] })
  pricing(
    @fromWorkflow("price", integer) price: number,
    @fromWorkflow("discount", optional(integer)) discount: Option<number>,
  ): Supplied {
    return this.supply(price - discount.unwrapOr(0));
  }

  /** Lends each attempt to charge the shop's card terminal. */
  @provider(PAYMENT_GATEWAY, { perAttempt: true, steps: ["charge"] })
  payments(@attempt() attempt: Attempt): Provided<PaymentGateway> {
    return this.provide(new Terminal(this.shop, attempt));
  }

  /** Names each journey after the shop and the order. */
  @idGenerator()
  orderId(@dataBag() data: DataBag): string {
    return `${this.shop}-${data.read("order", string).option().unwrapOr("unknown")}`;
  }
}

const executor = new LocalExecutor();
for (const order of [{ order: "1", price: 40, discount: 5 }, { order: "2", price: 10, discount: 10 }]) {
  const result = await executor.run(new Orders("corner").instance(order));
  console.log(result.journeyId, result.status.kind);
}
```

#### Every Rust macro and its counterpart

| Rust | TypeScript | Why it differs, when it does |
|---|---|---|
| `#[derive(Step)]` on a struct, with `#[input]`, `#[input("coupon")]` and `#[default]` fields | `@step()` on a class extending `Step`, whose constructor parameters carry `@input("amount", integer)` or `@input("coupon", optional(integer))`; its other fields are its own | A parameter's name is not available at run time, so the key is always written. The type comes from the metadata for `number`, `string`, `boolean` and classes that serialise themselves, and is written as a token or a schema otherwise, such as `integer` |
| `#[step]` on the block holding `run(self, #[service] payments: &dyn T, contributor, reporter)` | the `run` method, which `Step` declares abstract, its parameters marked `@service("payments", T)`, `@contributor()` and `@stepReporter()` | `Step` checks at compile time that `run` returns an outcome |
| `new(...)` building the step from its needs | the constructor, which may throw (`step could not be built`) | |
| `Option<T>` makes a request optional | `optional(integer)`, giving an `Option<number>`, and `{ optional: true }` for the failure reason and the error | The token says it at run time; the parameter is an `Option`, as in Rust |
| `Self::succeed()`, `fail`, `skip`, `skip_because` | `this.succeed()`, `this.fail(reason)`, `this.skip()`, `this.skipBecause(reason)`, protected methods of `Step` | |
| `#[derive(RescueStep)]` and `#[rescue_step]`, with `#[input]`, `#[from_rescued_step]` and unmarked `Reason` or `Error` fields | `@rescueStep()` on a class extending `RescueStep`, whose constructor parameters carry `@input(...)`, `@fromRescuedStep("key", integer)`, `@failureReason()` and `@error()`, and whose `run` returns `this.succeed()` or `this.fail(reason)` | `RescueStep` has no `skip`, and its `run` must return a rescue outcome |
| `#[step_policy(name = "audit")]` and `#[workflow_policy]` | `@stepPolicy({ name: "audit" })` on a class extending `StepPolicy`, and `@workflowPolicy()` on one extending `WorkflowPolicy` | The name is the class's name unless given, as in Rust; the documentation advises naming it, since minifiers rename classes |
| Hooks marked `#[on_step_success]`, `#[on_step_failure]`, `#[on_step_retry]`, `#[on_step_abnormal_termination]`, `#[on_workflow_success]`, `#[on_workflow_failure]` | `@onStepSuccess()`, `@onStepFailure()`, `@onStepRetry()`, `@onStepAbnormalTermination()`, `@onWorkflowSuccess()`, `@onWorkflowFailure()` | A step hook's decorator compiles only on a method of a `StepPolicy`, a workflow hook's only on a method of a `WorkflowPolicy` |
| A hook's requests: `#[from_step]`, `#[from_workflow]`, `#[role]`, and by type `StepName`, `Attempt`, `Reason`, `StepFailureCause`, `RetryCause`, `&Error`, `&JourneyId`, `&mut Contributor`, `HookReporter` | parameters marked `@fromStep(key, type)`, `@fromWorkflow(key, type)`, `@role<R>()`, `@stepName()`, `@attempt()`, `@failureReason()`, `@failureCause()`, `@retryCause()`, `@error()`, `@journeyId()`, `@contributor()`, `@hookReporter()` | A request Rust reads from a parameter's type is marked here, since the type does not exist at run time |
| `Self::keep_default()`, `fail_workflow(reason)`, `finish_workflow()` | `this.keepDefault()`, `this.failWorkflow(reason)`, `this.finishWorkflow()`, protected methods of `StepPolicy` | |
| A policy built with `Default`, or by a function marked `#[factory]` | built with `new`, its constructor taking no arguments; it may throw | A constructor can fail, so no factory is needed |
| `#[role]` on `impl Messages for Orders` | the workflow class `implements Messages`, and a policy names the roles it needs as its base class's type argument, `WorkflowPolicy<Messages>` | An interface does not exist at run time, and nothing there needs it: a hook's role is the workflow's own value |
| `#[workflow(name, policies, reporters)]` and `#[with_step(Charge, name, retry_budget, no_retry_on_abnormal_termination, policies, rescue)]` on a struct | `@workflow({ name, policies, reporters })` and `@withStep(Charge, { name, retryBudget, noRetryOnAbnormalTermination, policies, rescue })` on a class extending `Workflow`, with `@workflow` on the top line | The class's own instance is the workflow's own value, as the struct is in Rust. Class decorators run from the bottom up, so `@workflow` runs last and restores the written order |
| `#[workflow]` on the block holding `#[input_adapter(steps, name)]` methods, with `#[key]`, `#[from_workflow]`, `StepName`, `&JourneyId` and `&DataBag`, returning `Self::supply(value)` or `Self::from_data_bag()` | `@inputAdapter({ steps, name })` methods of the workflow class, their parameters marked `@key()`, `@fromWorkflow(...)`, `@stepName()`, `@journeyId()` and `@dataBag()`, returning `this.supply(value)` or `this.fromDataBag()` | One class instead of a struct and its block |
| `#[provider]` and `#[provider(per_attempt, steps, key, name)]`, returning `provide!(x)` or `provide!(x, data)` | `@provider(T, { perAttempt, steps, key, name })`, its parameters marked as for an adapter, plus `@attempt()`, `@stepName()` and `@providerReporter()`, returning `this.provide(x)` or `this.provide(x, data)` | The key and name come from the method's name unless given, as in Rust; the service type is a token, since a return type does not exist at run time |
| `#[id_generator]` | `@idGenerator()`, its parameter marked `@dataBag()` | |
| `Orders::builder()` with a setter per field, then `.initial_data(d)`, `.reporters_global_metadata(key, value)`, `.reporter(r)` and `.create()` | `new Orders(...).instance(initialData, { reporters, reportersGlobalMetadata })`, a method of `Workflow` | The workflow's value is made with its own constructor |
| `#[derive(InitialData)]` and `#[derive(Output)]`, with `result.output::<Receipt>()` | a `Map`, entries or a plain object given to `instance`, a property set to `undefined` being left out, and `result.output({ receipt: string })`, with the shape written as type tokens | A type cannot be read at run time, so the output's shape is written |
| `local_executor_for!(Orders)` | `new LocalExecutor()` | One executor (decision 1) |
| `#[async_trait]` | not needed | Any method may be `async` (decision 1) |

#### Where decorators are impossible, and what applications need

1. **Keys.** A parameter's name is not available at run time, so every request that Rust keys by a field's or a parameter's name has its key written.
2. **Functions.** Decorators exist only on classes and their members, so every step, policy and workflow is a class. There is no closure step.
3. **Compiler options.** Applications turn on `experimentalDecorators` and `emitDecoratorMetadata`, and `strict`, or at least `strictNullChecks` and `strictFunctionTypes`, without which several of the refusals of section 5 compile. A type-level guard makes the decorators fail to compile without `strictNullChecks`. `reflect-metadata` is a peer dependency that itinera imports itself, as NestJS does, so an application never has to import it first.
4. **Compilers.** TypeScript 5.0 or later (7.0.2, the native compiler, compiles these decorators and records their metadata), and swc, Bun and Deno with the options. esbuild, and so plain Vite, Vitest and tsx, compiles the decorators but records no metadata, so it cannot build an itinera application: applications use `tsc` or swc, and Vitest through its swc plugin, as NestJS projects do. The documentation says so in its first lines about decorators.
5. **Projects on the standard decorators**, with `experimentalDecorators` off, cannot use these decorators, since a project compiles one kind or the other. Supporting them as well is option 3 of decision 7, kept for when someone asks.

#### How the decorators are tested

- **Type tests** check every refusal at compile time of section 5 with `@ts-expect-error`, and include the proofs of the rules made impossible.
- **Unit tests** check what is recorded, every check made when a class is defined, and the check of parameter types against the metadata.
- **The conformance runner** declares every scenario's workflow as classes through these decorators (section 14), and its fixtures, written by hand, drive the cases' own sentences through workflows declared as an application would, as Rust's `@macros` features do.

### 5. Under the decorators: registration and the descriptors

How a declaration is recorded, checked and used:

1. **Parameters.** Each parameter decorator records its request with the class, the method (or the constructor) and the parameter's position, in a private table inside itinera. Nothing is added to the class.
2. **Methods.** Each method decorator records the method's kind, with its options, in the same table. Parameter decorators run before their method's decorator, and the metadata is attached before either, so the method decorator sees all of them.
3. **Steps and policies.** `@step`, `@rescueStep`, `@stepPolicy` and `@workflowPolicy` gather what their class's members recorded, check it, and record the class's declaration: a step's needs and its run requests, or a policy's name and hooks with their requests.
4. **The workflow.** Each `@withStep` records a step descriptor: its step class, name, retry budget, whether abnormal terminations are retried, policies and rescue step. `@workflow`, on the top line, runs last. It gathers the workflow class's marked methods, puts the steps back in written order, checks every violation of chapter 3, 3.6 that the types do not rule out, and stores the class's workflow descriptor in a private registry keyed by the class. Every violation found is thrown at once as `Violations`.
5. **The interfaces the executor uses**, named with the specification's words: `WorkflowDescriptor`, `StepDescriptor` and `PolicyDescriptor`. `Workflow` implements `WorkflowDescriptor` by reading its class's entry: its name, step descriptors, workflow policy descriptors and listing, and the calls into the workflow's own value that supply a step's input, provide a service and generate a journey ID. A `StepDescriptor` builds a step for an attempt, as `new Charge(amount)`, and runs it with its run requests. A `PolicyDescriptor` says which hooks it defines, builds an instance, and calls a hook by its kind, finding the method its decorator marked. The engine never looks a method up by name, except `run`.
6. **A hand-written descriptor runs too, and is checked.** The interfaces are public, so code that implements them without decorators runs like a declared workflow, as chapter 5, 5.9 point 2 requires. The registry knows which descriptors `@workflow` made and checked; `run` checks every other one for every violation before the journey, as chapter 3, 3.7 point 2 requires, and refuses the run if it finds any. The interfaces are typed with the same role parameters as the base classes, so a hand-written descriptor cannot express `role not provided` either. The documentation presents them as the engine's contract, not as a way to declare.
7. **Inheritance.** In tier 1, a declared class extends its base class directly: `@workflow` refuses a class whose parent is not `Workflow`, and likewise for the others. Inheriting declarations can be added later without breaking anything.

What is refused, and when:

| When | What |
|---|---|
| At compile time | A parameter whose declared type does not match its request, an optional request included; a hook, adapter, provider or `run` returning what its kind may not; a step hook on a workflow policy, or the reverse; a request on a parameter of a class that may not make it, such as `@fromStep` in a workflow policy; `@role<R>()` in a policy that does not name `R`; a policy whose roles the workflow class does not implement; a rescue step that skips; a write through an adapter's access to the data bag; a provider returning anything but `this.provide(...)`; a decorator on a class that does not extend its base class |
| When the module loads, from the metadata | A request that writes no type where there is no metadata, naming the class and the option to turn on, or where the metadata records only `Object`, naming the parameter whose type must be written |
| When the class is defined | Every other violation of chapter 3, 3.6, such as two steps with one name, an adapter naming a step the workflow does not have, or `@attempt()` on a provider of journey scope; a request a hook's kind may not make, such as the cause in `on step success`; a request an input adapter, a provider or the ID generator may not make, such as `@contributor()` on an adapter or `@dataBag()` on a provider, since all three are methods of the workflow class; a parameter with no request; a step class not declared with `@step`; a decorator above `@workflow`; a class declared twice |
| When an instance is made | A subclass of `Workflow` not declared with `@workflow`, which a decorator cannot make a type error |
| When `run` is called | Every violation of a descriptor written by hand |

Everything in the last four rows happens before any journey, so throwing there keeps the rule that nothing escapes `run`. The metadata supplies the type of a request that writes none, only where the declared type is unambiguous (section 3); everywhere else the compiler checks the written token or schema against the parameter.

Notes for the tech spec, from the reviews of this plan:

1. A legacy method decorator is generic in the method's type, since `TypedPropertyDescriptor<M>` is invariant.
2. A workflow hook is typed `void | Promise<void>`, since a method returning a value fits a bare `void`.
3. The roles a policy names live in a public or symbol-keyed phantom member, since a `protected` one lets every workflow pass.
4. Errors from overloaded decorators read "No overload matches this call", so the decorators avoid overloads where they can and the documentation lists the usual causes.
5. A parameter with no request is found from the length of the metadata's parameter types where there is metadata. A `run` with no decorated parameter has none, so it falls back to `Function.length`, which misses parameters with defaults and rest parameters; the documentation says so.
6. A parameter decorator is typed through its target's method and its literal position, `Parameters<T[K]>[I]`, or `ConstructorParameters<C>[I]` for a constructor. This cannot reach `protected` methods, so hooks, adapters, providers and `run` are public.
7. The roles a policy names are a covariant phantom, `declare readonly [roles]: R`, and `StepPolicy` and `WorkflowPolicy` carry distinct brands, since otherwise each is structurally the other.
8. The compiler's own message for a mismatched parameter is cryptic, so the types carry a readable reason, such as a string literal type naming the mismatch.

### 6. Steps

What section 4 declares, a step receives exactly: its inputs in its constructor, then its services, a contributor and a step reporter in `run`, already typed.

- **Requests resolve in the order written**: the constructor's parameters, then `run`'s.
- **Built once per attempt.** The engine makes the step with `new` for each attempt, giving its constructor its inputs. The constructor may throw (`step could not be built`). Nothing carries over between attempts.
- **Outcomes**: `this.succeed()`, `this.fail(reason)`, `this.skip()` and `this.skipBecause(reason)`, where a reason is a code alone or `{ code, message, details }`, as chapter 6, 6.11 point 2 suggests. `Step` declares `run` abstract, returning an outcome, or a `Result` holding one, or a promise of either, so a step without `run`, or returning anything else, does not compile. An `Err` is treated exactly as a throw carrying its error (decision 8). What still comes back through `any` or a cast, or anything `run` throws, is an abnormal termination, carrying the thrown error.
- **Handles belong to the attempt.** The contributor and the step reporter are made for the attempt and closed when it ends. A call on a closed handle runs nothing, changes no journey, and throws where it is made, synchronously, as chapter 4, 4.6 point 7 says it should.
- **Emitting is awaited.** `reporter.info`, `warning` and `error`, each with optional data, and `setGlobalMetadata`, return promises, since reporters may be asynchronous. Every call on a step's handles goes through one queue, so a step that does not await an emit still gets the specification's order: the engine settles every call the step started before it records the outcome. The documentation recommends the `no-floating-promises` lint rule to applications.
- **The executor's signal.** The engine records the abort at once, and the call that caused it ends the step with an error of a class the package never exports: an emit or an entry of global metadata on which a reporter failed, global metadata that is not a value or sets `journey_id` (`reserved metadata key`), and a contribution that is not a value, which throws synchronously since `contribute` returns nothing. Whatever the step does afterwards, catching it included, is ignored.
- **No unhandled rejections.** Node ends the process on a rejected promise that nobody handles, so the engine attaches a handler that does nothing to every promise it hands to custom code. A step that awaits the promise still sees the rejection; one that does not cannot crash the application.
- **Rescue steps** extend `RescueStep` and are declared with `@rescueStep()`, with the extra requests `@fromRescuedStep(key, type)`, `@failureReason()` and `@error()` on its constructor's parameters. `RescueStep` offers only `this.succeed()` and `this.fail(reason)`, and its `run` must return one of them, so a rescue step that skips does not compile. If a cast returns a skip anyway, the engine aborts the journey with `rescue skipped`.

### 7. Policies, hooks and roles

- **Two kinds of policy**, classes extending `StepPolicy` or `WorkflowPolicy`. A step hook's decorator compiles only on a method of a `StepPolicy`, and a workflow hook's only on a method of a `WorkflowPolicy`, so a policy with hooks of both kinds cannot be written.
- **Each hook marks its parameters** with what its kind may request: data from the step, the step's name, the attempt, the failure reason and the error for step hooks, and the cause for `on step failure` and `on step retry` only; data from the workflow, the journey ID, roles, a contributor and a hook reporter for every hook. A request that only step hooks may make does not compile in a workflow policy; one that only some step hooks may make, such as the cause, is refused when the class is defined, since a parameter decorator cannot see its method's decorator.
- **Each hook returns its own type**: `OnSuccess` for `on step success` (`this.keepDefault()`, `this.finishWorkflow()`, `this.failWorkflow(reason)`), `OnFailure` for the three failure hooks (`this.keepDefault()`, `this.failWorkflow(reason)`), and nothing for workflow hooks, as chapter 6, 6.11 suggests. The hook decorators type what the method returns, so a failure hook returning `this.finishWorkflow()` does not compile. A hook may also return a `Result` holding its lifecycle; an `Err` is treated exactly as a throw carrying its error, `hook failed` (chapter 5, 5.10), and is checked before the lifecycle. The engine still checks what actually came back, since `any` or a cast slips past the types: `undefined` means the default (chapter 6, 6.3 point 1), and anything else a hook may not return aborts the journey with `invalid lifecycle`. Input adapters, providers and the ID generator may return a `Result` in the same way.
- **Policy instances** are built by the executor with `new`, their constructors taking no arguments, which the decorators' types require: workflow policies once per journey, before the dispatcher is created, where a failure is a refusal; step policies for every attempt, where a failure aborts with `policy could not be built`. They are not frozen: `Object.freeze` is shallow and does not reach private fields, so it cannot make an instance read-only, and it would turn a hook that changes its policy into `hook failed`. So chapter 6, 6.1 point 7 falls to its last sentence: rebuilding the instances is what keeps any change from outliving the attempt or the journey, as the last of Rust's notes for other languages says. The tech spec records it.
- **Roles** are interfaces. A workflow provides a role by implementing it, as `Orders implements Messages`. A policy names the roles it needs as its base class's type argument, `WorkflowPolicy<Messages>` or `StepPolicy<Messages & Payments>`, and a hook requests one with `@role<Messages>()`, which compiles only in a policy that names it. `@workflow` and `@withStep` compile only when the workflow class implements the roles of every policy they attach, so `role not provided` cannot be written. A hook's role is the workflow's own value. Nothing about roles exists at run time: if a cast slips a workflow past the types, the hook's call on the missing method throws, and the journey ends with `hook failed`.

### 8. Workflow declarations

- **`@workflow` makes the workflow descriptor** when its class is defined, or throws `Violations`, listing every violation of chapter 3, 3.6 at once: all fourteen except `mode not accepted`, which does not arise with one executor accepting both kinds, and `role not provided`, which does not compile.
- **Each step states everything**: a retry budget (0 unless set, a non-negative integer checked when declared), whether abnormal terminations are retried (yes, unless `@withStep` sets `noRetryOnAbnormalTermination: true`, as Rust's attribute of that name), its policies in order, and its rescue step.
- **`@workflow`'s `reporters`** lists reporter classes, each built with `new`, with no arguments, for every journey, before the instance's own reporters.
- **Names** are non-empty strings, checked when declared, with branded types (`StepName`, `PolicyName` and so on) so that a plain string is not mistaken for one. A step named in an adapter's or a provider's `steps` is checked against the workflow's steps when the class is defined, since one decorator cannot see another's names at compile time.
- **`Orders.listing()`**, a static method of `Workflow`, gives each step's name, position, policies, input adapter, services with the provider serving each, and its rescue section.
- **Input adapters** are methods of the workflow class marked `@inputAdapter`, their parameters marked with what they request (the step's name, the key, data from the workflow, the journey ID, read access to the data bag), returning `this.supply(value)` or `this.fromDataBag()`, as chapter 4, 4.11 point 1 suggests. Their access to the data bag has no method that writes, in its type or at run time, and shows nothing once their call has returned.
- **Service providers** are methods of the workflow class marked `@provider`, with a service token, a scope, the steps they serve, an optional key and name, and their parameters marked with what they request: what an adapter may, and, for a provider of attempt scope, the step's name and the attempt, and a means of emitting `journey_*` events and setting global metadata, `@providerReporter()` (chapter 4, 4.9 point 7). `@attempt()` or `@stepName()` on a provider of journey scope is the violation `attempt request in journey scope`, found when the class is defined. A provider returns `this.provide(instance)` or `this.provide(instance, data)`, typed `Provided<T>` for the token's service, so returning nothing does not compile; whatever comes back otherwise through a cast is `service_provider_failed` and `step could not be built`. The implementation `service_provided` names is the instance's constructor name, or the service token's name for an object with no class of its own, as chapter 4, 4.9 point 6.3 allows; the tech spec warns that minifiers rename classes. `wrong service type` compares service tokens.

### 9. The workflow instance

- **`new Orders(...).instance(initialData, { reporters, reportersGlobalMetadata })`**, a method of `Workflow`, creates an instance: its initial data, then its journey ID, from the workflow's ID generator or `crypto.randomUUID()`, then its reporters, as chapter 5, 5.1 orders them. `reporters` lists reporters, or functions that take the journey ID and return one, so a reporter may receive the journey ID; they come after the reporters `@workflow` lists. It throws, before any journey, for a class not declared with `@workflow`.
- **The executor relies on one interface,** `WorkflowInstance`, the counterpart of Rust's trait, holding the workflow descriptor, the workflow's own value, the initial data, the journey ID, the reporters and the initial global metadata, so a hand-written instance runs as well as one `instance` made, as chapter 5, 5.9 point 2 requires.
- **An instance runs once.** Running it again is refused.

### 10. The executor and the engine

- **`LocalExecutor`**, with an optional dispatcher factory. `await executor.run(instance)` resolves to the journey's result; a refusal, before any journey, rejects with a `Refusal` error naming what refused it and carrying the error that caused it (decision 6).
- **Before the journey**, in this order: refuse an instance that ran, or a call while a journey runs; check a workflow descriptor that `@workflow` did not make for every violation, and refuse it if it has any; refuse initial data or initial global metadata that is not a value, or that sets `journey_id`; build the workflow policies; create the dispatcher and add the guarded reporters; set `journey_id`, then the initial global metadata. A failure in any of these is a refusal, with no event.
- **One journey at a time.** A call to `run` while the executor's journey is still running is refused before anything starts; parallelism comes from several executors.
- **One engine**, private, written once with `async` and `await`. It awaits whatever custom code returns, so synchronous and asynchronous steps, hooks, providers and reporters are all accepted. It never sets timers, never cancels and never yields on its own, so it runs on any event loop.
- **Inside the engine**, the same seams as Rust: the scan, a pure decision function, the step and hook callers, request resolution, services with journey-scoped instances kept until the journey ends, the rescue, the emitter with its replaceable clock, guards around reporters, and a runner seam that builds and runs a step, which scripted runs replace.

### 11. Events, reporters and dispatchers

- **`Event` is a discriminated union on `kind`**, the snake_case names of chapter 2, one member per kind, each carrying its fixed fields: the sequence number from 1, the timestamp as an ISO 8601 string in UTC, the journey ID, the workflow name, and the fields of its kind. Events are deeply frozen, data included, so one reporter cannot change what the next one reads. No engine event has a field that can hold a data bag value.
- **Reporters** have `report(event)` and, optionally, `setGlobalMetadata(key, value)`, each returning nothing or a promise. A `DebugReporter` prints each event, as Rust's does.
- **Dispatchers and their factories** follow chapter 2, 2.2; `DefaultDispatcher` calls reporters in the order added. The executor wraps each reporter it adds in a guard, so the rules of 2.3 hold whatever the dispatcher.
- **Global metadata** is set on the dispatcher before `journey_started` (the journey ID, then the instance's entries), and by steps, hooks and providers through their reporters while the journey runs. Setting `journey_id` while the journey runs aborts it with `reserved metadata key`, and the entry reaches no reporter.

### 12. The result and errors

- **`JourneyResult`**: the journey ID and a status that is a discriminated union: succeeded with the data bag, failed with the failure and the data bag, aborted with the abort and no data bag. `isSucceeded()`, `isFailed()`, `isAborted()`, `failure` and `abort` read it without a switch, as chapter 5, 5.14 suggests.
- **A failure** carries its cause, its reason and its error as chapter 5, 5.8 lists; **an abort** its reason, details and error. The result holds the thrown value itself, and its message: `error.message` for an `Error`, `String(value)` otherwise. Both can throw (a `message` getter that throws, or an object with no prototype), so the message is read defensively, with a fixed text when reading it fails, since nothing may escape `run`.
- **`Violations`**, **`Refusal`** and the test mistakes are `Error` subclasses.

### 13. Test support (`itinera/testing`)

The five parts of chapter 8, with its suggested names in camelCase: `RecordingReporter` with `events`, `globalMetadata` and `path`; `fakeProvider`, applied to an instance by a function of `itinera/testing`, so that nothing of test support is reachable without importing it; `scripted()` with `step`, `andStep`, `onAttempt`, `onEveryAttempt`, `onRemainingAttempts`, `willContribute`, `willEmit` (with optional data), `willSetGlobalMetadata`, `willSucceed`, `willFail`, `willSkip`, `willTerminateAbnormally`, `willRunForReal`, `ensureAllScripted`, `run`, and the record's `attempts`, `attempt` and `input`; the `Ending` a scripted attempt plays; and the recorders `Contributions`, `StepEventReporter`, `HookEventReporter` and a data bag built with `with`. A mistake in a test throws a `TestMistake` naming each problem, before the journey: a mistake in writing the script where it is written (chapter 8, 8.5 point 8), and what the script leaves out when it runs. `fakeProvider` takes the provider's name and a service token, so a fake making another service is the mistake `another service`, and a script that contributes, emits or sets global metadata for a step that declares no contributor or reporter is `no contributor` or `no reporter`.

## Rules made impossible, and rules enforced at run time

The specification lets a language make nine rules impossible to express, and itinera-rs excludes all nine with proofs. TypeScript is what itinera-ts supports, so five of them do not compile, each with a proof: a type test of `@ts-expect-error` lines, which fails the type check if the code ever compiles. Each proof lands with its feature, with its entry under `impossible` in `conformance.json`, as in Rust:

| Tag | What does not compile |
|---|---|
| `invalid-lifecycle` | a hook returning a lifecycle its kind may not return, such as a failure hook finishing the workflow |
| `rescue-skip` | a rescue step that skips: `RescueStep` has no `skip`, and its `run` must return a rescue outcome |
| `no-instance` | a provider returning anything but `this.provide(...)` |
| `role-not-provided` | a policy attached to a workflow class that does not implement the roles it names |
| `bag-write` | a write through an adapter's access to the data bag, which has no method that writes |

Where `any` or a cast can still slip past a type, the engine keeps its check, so that nothing escapes `run`: the lifecycle check, the `rescue skipped` abort and the provider check, each covered by unit tests. A cast around a role ends as `hook failed` (section 7).

The other four cannot be refused by types, so their scenarios run like the others, or do not arise:

| Tag | How itinera-ts enforces it |
|---|---|
| `journey-scope-request` | the violation `attempt request in journey scope`, found when the class is defined, since a parameter decorator cannot see its method's decorator (section 8) |
| `non-value` | the value check at every entry point, since types cannot refuse `NaN`, cycles or getters (section 2) |
| `late-handle` | handles closed when their attempt, hook or call ends |
| `mode-not-accepted` | does not arise: its two scenarios are also tagged `@capability-sync`, and `sync` is not claimed |

Two more tags, of test support, are enforced at run time: `undeclared-handles` by the mistakes `no contributor` and `no reporter`, and `fake-service-type` by the mistake `another service` (section 13).

One rule of chapter 3, 3.8 has no tag and cannot be enforced in TypeScript: a step keeping a service after its attempt. Chapter 4, 4.9 point 8.1 allows that, since the executor never lends the service again; the documentation says not to keep one.

## Testing

### 14. The conformance runner

- **`packages/conformance`**, run with `npm run conformance`, on cucumber-js (13.x), whose JSON formatter writes the Cucumber JSON report. It reads `ITINERA_CONFORMANCE_CASES`, `ITINERA_CONFORMANCE_TAGS` and `ITINERA_CONFORMANCE_REPORT`, and fails when a selected scenario fails or uses an undefined sentence.
- **Only the public API**, as in Rust: Given sentences fill a plain scenario model, and "When the workflow runs" turns it into classes. The runner makes empty subclasses of the base classes and applies the public decorators to them in code, which legacy decorators make plain function calls. No compiler records metadata for these classes, so the runner records it itself, as the compiler would, before applying the decorators. So every scenario goes through the same decorators and checks as an application. Scripted steps end through test support's `Ending`, scripted policies get exactly the hooks the scenario lists and record what they received, and scripted reporters and a recording dispatcher factory record the rest. Step statuses are derived from the events.
- **The `run-conformance` action** of itinera-dev/actions runs it unchanged: it only needs a command.
- **Fixtures**, the counterpart of Rust's `@macros` features, live in `packages/conformance/features/fixtures`: workflows written by hand as an application writes them, driven through the cases' own sentences, with a Given sentence naming each workflow, such as `Given the payment workflow`.
- **Scenarios of a rule made impossible** are excluded through `conformance.json`, as in Rust.

### 15. TypeScript's own tests

- **Unit tests** with Vitest, next to the code they check, named as sentences, with `it.each` named cases for one rule over several inputs.
- **Type tests** with Vitest's type checking (`expectTypeOf` and `@ts-expect-error`): every refusal at compile time of section 5, run on the oldest TypeScript applications may use, 5.0, and on the pinned one; TypeScript 5.0.4 was confirmed in stage 0 to type parameter decorators by their position, as 6.0 and 7.0 do: a mismatch at any position is refused with error TS1239. The proofs of the rules made impossible live in `packages/itinera/tests/proofs.test-d.ts`, one named test each, which `conformance.json` points to.
- **Property-based tests** with fast-check, as Rust's proptest ones: first and last events, increasing sequence numbers, one outcome fact per attempt, one decision per failed attempt, attempt counts within the budget, no data bag values in engine events.
- **Examples in the documentation are real files** under `examples/`, compiled and run by the tests and pulled into the API reference with TypeDoc's `@includeCode`, so no example can rot.
- **The package itself** is checked with `publint` and `@arethetypeswrong/cli`, so its exports and types resolve for every consumer.

### 16. Continuous integration

Each job runs one npm script, as the organisation's automation rule requires: format, lint, type check, tests on Linux on Node 22 and 24, the LTS lines, and on the current Node 26, and on the newest LTS on Windows and macOS, build and package checks, the API reference with warnings as errors, a licence and advisory check of dependencies, conformance through `run-conformance`, `pr-has-issue`, `no-cross-repo-closing` and `commit messages`.

## Order of work

### 17. Stages

The order follows the specification's suggested implementation order, as Rust's did, but with services, rescue steps, global metadata and test support known from the start, so declarations and admission cover them at once. There is no stage for decorators, as Rust has for its macros: every stage that adds something an application declares or calls lands its base class members and decorators, with their type tests, proofs and runner fixtures, so the public API grows with the implementation.

| Stage | Content | Proposals completed |
|---|---|---|
| 0. Bootstrap | the repository, the npm workspace, `tsconfig` in strict mode, lint, format, Vitest, CI, commit convention and git-cliff, README, licences, `conformance.json` pinning rc.15 with the capabilities, no proposals and nothing under `impossible` yet, and everything section 19 copies from itinera-rs | none |
| 1. Values and events | the value check and copy, `Event` and what it carries, reporters, dispatchers and their factories, `DefaultDispatcher`, global metadata on dispatchers | none |
| 2. Runner skeleton | cucumber-js, the environment variables, the scenario model, the recording dispatcher factory, the JSON report | none |
| 3. Minimal executor | the base classes `Workflow` and `Step`, the registry and the descriptor and instance interfaces, `@step`, `@workflow`, `@withStep` and `@idGenerator`, the metadata check, the runner's classes built at run time; the engine and `LocalExecutor`, a workflow of one step that succeeds, the instance and journey IDs, reporters, the result and refusals | none |
| 4. Declarations and admission | every other base class, every declaring decorator, every request's parameter decorator and the type tokens, so that everything is declared and checked: steps, policies, roles, input adapters, service providers and rescue steps; every violation, also checked by `run` for hand-written descriptors; the listing. Later stages make what is declared run | 0062 |
| 5. Steps | resolving requests, `classOf`, `guard`, Standard Schema validators and `itinera/result`, building per attempt, input adapters with their requests and data bag access, outcomes, contributions, handles and the executor's signal, steps setting global metadata | none |
| 6. The scan and its decisions | statuses, retries, `retry on abnormal termination`, aborts, the result and `output` | 0012, 0032, 0042, 0056, 0061, 0063, 0064, 0065 |
| 7. Policies, hooks and roles | building policies, every hook and its requests, lifecycles, roles, workflow hooks, hooks setting global metadata | 0002, 0008, 0009, 0010, 0011, 0024, 0027, 0040, 0041, 0049, 0054, 0055, 0057, 0058, 0060, 0081, 0083, 0085, 0091, 0106 |
| 8. Services | providers of both scopes, their requests, events, data, global metadata and implementation names | 0095, 0102, 0104 |
| 9. Rescue steps | the rescue, its requests, decisions and statuses, adapters and providers attached to `<step>_rescue` | 0003, 0098, and with it tier 1 |
| 10. Test support | `itinera/testing`, the runner's test support sentences, `testing` claimed | 0108 |
| 11. Release | the API reference, the package overview, examples, the release workflow, `0.1.0-beta.1` | none |

The proposals in each row are those whose every scenario can pass once that stage lands; 0102 waits for stage 8 because one of its scenarios, tagged with 0102 alone, has a service provider set an entry. The tech specs confirm the exact split, and a scenario tagged with two proposals simply waits until both are listed.

### 18. Issues, tech specs and pull requests

- **A tracking issue**, "Tier 1 plan" ([#1](https://github.com/itinera-dev/itinera-ts/issues/1)), the counterpart of itinera-rs#7, holding the stage checklist; work that belongs to no proposal refers to it.
- **One implementation issue per proposal**, "Implement spec#NNNN (short name)", labelled `implements-proposal` and `tier: 1` (0108 has no tier label), each summarising this plan's decisions for it.
- **Tech specs** in `docs/specs/NNNN-short-name.md`, created by the first pull request touching the proposal and completed by the one that closes it, which also lists the proposal in `conformance.json`.
- **Each stage is one stack** of pull requests linked with GitHub's stacks API, every layer passing all of `main`'s checks, merged with merge commits; a separate reviewer agent reviews every change before its pull request opens and after each later push; the maintainer hears a pull request is ready only when review and CI have both passed.
- **Public API of a proposal not yet listed** is exported only from the subpath `itinera/unstable` until its proposal is listed, the TypeScript counterpart of Rust's `unstable` feature.

### 19. What stage 0 copies from itinera-rs

The maintainer asked for this to be part of the plan. Stage 0 copies these from itinera-rs and adapts each to TypeScript in the same pull request, keeping what is not about Rust word for word, so that the two repositories keep one way of working:

| From itinera-rs | In itinera-ts |
|---|---|
| `AGENTS.md`, and `CLAUDE.md` importing it | The same structure: where behaviour comes from, the stages of this plan, the code rules of the next section, comments, how to run the checks and the runner, pull requests and stacks, writing, working with the maintainer |
| `.claude/skills/review-change` | The reviewer's checklist, with the TypeScript code rules and the decorators in place of the Rust and macro items, and the rule to tell every reviewer never to put the maintainer's email in any request or file |
| `.claude/skills/commit` | Unchanged apart from scopes, which are the TypeScript modules |
| `.claude/skills/stack` | Unchanged apart from the repository's name |
| `.claude/skills/architecture` | Adapted to `docs/architecture.md` of itinera-ts, which starts in stage 3 and gains a section per stage, as Rust's does |
| `.claude/skills/release` | Rewritten for npm: the version in `package.json`, the `next` dist-tag for pre-releases, trusted publishing on npm, then the book and the site as Rust's skill says |
| `docs/contributing.md` | The checks, the commit messages and the changelog, the release, with npm in place of cargo |
| `cliff.toml` | Unchanged |
| `.github/workflows/pull-request-checks.yml` | Unchanged: `pr-has-issue`, `no-cross-repo-closing` and `commit messages` |
| `.github/workflows/ci.yml`, `release.yml` and `weekly.yml` | The same jobs, each running one npm script; the weekly run tries the next TypeScript and Node versions |
| `LICENSE-APACHE`, `LICENSE-MIT`, `.gitattributes`, `.gitignore` | Unchanged licences; ignores for npm |
| `README.md` | For end users only, as the project instructions require: what itinera is, how to install it, the tier and capabilities claimed, learning links, how to run the runner |
| `conformance.json` | Same shape, with no proposals and no exclusions yet; proofs of rules made impossible land with their features |
| `docs/tier-1-plan.md` | This plan, once its decisions are taken |
| The memory notes of this project | Nothing to copy: they are shared by every thread already |

## Code rules for the agents' manual

The new AGENTS.md carries Rust's rules over where they are not about Rust:

- Names use the specification's vocabulary, in camelCase as proposal 0111 shows (`keepDefault`, `fromDataBag`, `isFirst`), and types in PascalCase.
- Types hold every constraint they can: branded names, an `Attempt` type counted from 1 with `isFirst`, discriminated unions for closed sets, `readonly` everywhere. A comment stating a constraint the type could enforce means the type is wrong.
- `tsconfig` turns on `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `noImplicitOverride`; lint uses typescript-eslint's strict type-checked rules, with `no-floating-promises` and `no-explicit-any` as errors.
- No throw escapes `run` while a journey runs; declarations may throw before a journey, with a message saying what was wrong.
- Modules follow concepts; a file past 200 lines holds one thing; a test file sits beside its module.
- Enums that carry data, such as `Event` and `Outcome`, are discriminated unions, matched with `ts-pattern`'s `match(...).exhaustive()`; a plain `switch` over one passes typescript-eslint's `switch-exhaustiveness-check`. Closed sets of names, such as hook kinds and statuses, are declared with `enum-plus`, which gives their names, parsing and every value from one declaration (decision 10).
- Array methods over loops that build a result, and chains that read as a sentence of named functions, as Rust's closure rule says.
- Reuse before writing: the standard library and the web platform, then packages already depended on, then well-known packages; write it ourselves only when none fits. Every runtime dependency has a stated reason in the tech spec that adds it.
- As few comments as possible, never referring to specification sections, issues or pull requests; no `TODO`.
- Every exported item documented in British spelling, with an example that compiles and runs.
- Every declaration an application writes is a class extending one of itinera's base classes, marked with legacy decorators; a decorator gives way to another form only where section 4 says the language makes it impossible.
- Whatever TypeScript can refuse does not compile, and a type test shows it; a rule that types cannot hold is checked at run time.

## Tooling

- **TypeScript 6.0**, pinned. Applications need TypeScript 5.0 or later, with `experimentalDecorators`, `emitDecoratorMetadata` and `strict` (decision 7). Vitest runs through its swc plugin, since esbuild records no decorator metadata. TypeScript 7.0, the native compiler, is out, but typescript-eslint supports only versions below 6.1, and its type-aware rules matter for an asynchronous engine. Moving to 7 waits until the lint supports it.
- **npm workspaces**, Vitest, fast-check, ESLint with typescript-eslint, Prettier, TypeDoc, publint, arethetypeswrong, cucumber-js; Node 22 and later.
- **Releases on npm** through trusted publishing from the release workflow, with provenance. Pre-releases are published under the `next` dist-tag, since npm otherwise makes any version `latest`.

## Release

- **The first release is `0.1.0-beta.1`**, pinning the newest cases candidate, as Rust did; `0.1.0` follows once the cases are tagged `v0.1.0`.
- **The release workflow** mirrors itinera-rs: `release-gate` (tag matches `package.json`, commit on `main`, changelog section, every tier 1 proposal listed), CI on the tagged commit, `npm publish` in a `npm` environment, and `create-release` with the conformance report attached.
- **`release-gate` reads `Cargo.toml` today**, so itinera-dev/actions needs a small change to read `package.json` before the first release.
- **npm trusted publishing is configured on an existing package**, so, as with crates.io, the first version is published by hand by the maintainer, and every later one by the workflow.
- **After the release**, out of this plan: the site's `languages.json` entry for TypeScript, a news post, and a TypeScript edition of the book.

## What the maintainer does by hand

1. Create the repository: done by the maintainer on 2026-10-16, since the session's GitHub access cannot create repositories.
2. After stage 0, add the "Protect main" ruleset requiring the CI checks, with merge commits only.
3. Make sure the labels `implements-proposal`, `tier: 1`, `spec update` and `waiting for spec` exist in the new repository.
4. Before the first release: the `npm` environment, the first publish of `itinera` by hand, then trusted publishing for `release.yml`, and the tag.

## Decisions

Each was put to the maintainer one at a time, with a recommendation, before any code.

1. **Execution modes.** DECIDED (the maintainer, 2026-10-15): option 1.
   1. One asynchronous executor that accepts synchronous and asynchronous steps, hooks, providers and reporters alike; claim `async` and `testing`. *(Recommended: TypeScript is asynchronous by nature, a synchronous-only executor would refuse almost every real step, and a synchronous executor can be added later without changing this one.)*
   2. Both executors, `sync` and `async`, from one engine written as generators that a synchronous or an asynchronous driver runs; every part declares its mode, and `run` reports `mode not accepted`.
2. **How workflows are declared.** DECIDED (the maintainer, 2026-10-15 and 2026-10-16): decorators are the public API applications write, as close to Rust's macros as possible, giving way only where the language makes them impossible, and their whole surface is part of this plan (section 4). TypeScript, not JavaScript, is supported, so whatever TypeScript can refuse does not compile. Applications extend abstract base classes, which implement the interfaces the executor uses (section 5). There is no builder: the conformance runner declares classes too. A step receives its inputs as its constructor's parameters, each marked with its request.
3. **How requests name their types.** DECIDED (the maintainer, 2026-10-16): the metadata supplies the type where it is unambiguous; elsewhere a request writes one of itinera's tokens or, optionally, a Standard Schema validator such as a Zod schema, which only checks (section 3). Generating every type from the declarations waits for after tier 1, since TypeScript 7 runs no compiler plugins.
4. **Package.** DECIDED (the maintainer, 2026-10-16): one package, `itinera`, with one subpath per concept mirroring Rust's modules, and test support at `itinera/testing`.
5. **What a value is.** DECIDED (the maintainer, 2026-10-16): plain JSON data, or an instance of a class that serialises itself with `toValue` and `fromValue`, turned into plain data when captured (section 2).
6. **A refusal from `run`.** DECIDED (the maintainer, 2026-10-16): `run` rejects with a `Refusal` error.

7. **Which decorators.** DECIDED (the maintainer, 2026-10-16): option 2. Many applications compile with `experimentalDecorators` and `emitDecoratorMetadata`, and a project compiles one kind of decorator or the other.
   1. One API that works under both kinds, with requests listed on the method's decorator.
   2. Legacy decorators only, with parameter decorators. Chosen. Each parameter decorator is typed against its parameter, so a mismatch does not compile (section 5). `emitDecoratorMetadata` is required, and supplies the type of a request that writes none (decision 3).
   3. Both: option 1, plus parameter decorators under the legacy kind only. Kept for when someone asks.

8. **Option and Result.** DECIDED (the maintainer, 2026-10-16): `Option` yes, from `ts-results-es` (Rust's names, no dependencies, CommonJS and ESM), re-exported from `itinera/result`: optional requests and data bag reads give an `Option`. `Result` perhaps: throwing stays the normal way for custom code to fail; custom code may also return an `Err`, which fails exactly as a throw does, but nothing requires it. itinera recognises an `Err` through its own methods, never `instanceof`, so another copy of the package still works. `itinera/result` re-exports the values (`Some`, `None`, `Ok`, `Err`) as well as the types, and the documentation and a lint rule say to import them only from there: the review found that an ESM application importing them from `ts-results-es` directly fails to type-check against itinera's CommonJS declarations.

9. **How a value is checked and copied.** DECIDED (the maintainer, 2026-10-16): option 1.
   1. `is-json-value`, which reports each problem with its path, bundled into the CommonJS build since it is ESM only, with `structuredClone` for the copy and one rule of itinera's refusing objects whose prototype is not plain, such as a `Date`. *(Recommended: reuse, with a dozen lines of glue.)*
   2. A walk of itinera's own.

10. **Enums.** DECIDED (the maintainer, 2026-10-16): `ts-pattern` for exhaustive matching, the typescript-eslint rule for `switch`, and `enum-plus` for the names, parsing and every value of closed sets, as Rust's derives give them.

Defaults taken without asking, which the maintainer may still change: the repository layout, Node 22 and later, the tooling of the Tooling section, Conventional Commits from the first commit, and the stage order.

## Points to watch

- **A gap in the specification stops the work**, as in Rust: it goes to the maintainer and to `spec`, never decided in TypeScript.
- **Unawaited emit calls** are the main TypeScript-only trap; section 6 says how the engine keeps the order and avoids unhandled rejections, and stage 5 tests both.
- **Implementation names** come from constructor names, which minifiers change; the documentation says so.
- **Typing the decorators** is the hardest TypeScript in the plan; stage 3 starts with the type tests of section 5, before the code they check.
- **Two copies of the package** in one application would not share the registry, tokens or error classes; the single CommonJS build behind the ESM layer prevents one source of them, two installed versions remain, and the documentation says to keep one copy.
- **The cases move to `v0.1.0`** during this work; if anything changes after rc.15, the change is adopted as Rust adopts it.
