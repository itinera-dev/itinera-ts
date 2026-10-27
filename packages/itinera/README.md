# itinera

The TypeScript implementation of [Itinera](https://itinera-dev.org/), a workflow framework that keeps business rules separate from flow control. It implements the [Itinera specification](https://github.com/itinera-dev/spec), whose vocabulary it uses.

A workflow is a list of steps. Each step holds one piece of business logic and says only how it ended: it succeeded, it failed with a reason, or it was skipped. Everything around the steps, such as retrying a failed attempt, passing data from one step to the next, lending a step the services it needs, and telling every reporter what happened, is the executor's work, done the same way for every workflow. Policies attached to a step or to the whole workflow change those decisions in one place, without touching the steps.

## Installing it

```sh
npm install itinera@next reflect-metadata
```

Every version of itinera so far is a pre-release, published under the dist-tag `next`, so `itinera@next` installs the newest one.

itinera runs on Node 22.12 and later, and works with `import` and `require` alike. It uses only the language and the web platform, so it also runs on Deno and Bun, and in browsers through a bundler, though CI tests it on Node alone; in a browser, the default journey IDs need a secure context.

Applications declare their workflows as classes marked with decorators, which need TypeScript 5.5 or later with `strict`, `experimentalDecorators` and `emitDecoratorMetadata` turned on, and a compiler that records decorator metadata, such as `tsc` or swc. An application whose compiler records none, such as esbuild, Vite or tsx, puts the same classes together with the builder instead, `Orders.builder()`, which needs only TypeScript 5.5 or later with `strict`.

## A first workflow

The workflow below charges an order and then ships it. A failed charge is retried up to twice, and a charge of nothing fails, so the second journey fails once its retries are exhausted.

```ts
import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { type Contributor, contributor } from "itinera/journey";
import { input, type Outcome, Step, step } from "itinera/step";
import { integer, string } from "itinera/value";
import { withStep, Workflow, workflow } from "itinera/workflow";

@step()
class Charge extends Step {
  constructor(@input("amount", integer) private readonly amount: number) {
    super();
  }

  override run(@contributor() contributor: Contributor): Outcome {
    if (this.amount <= 0) return this.fail("nothing to charge");
    contributor.contribute("receipt", `charged ${String(this.amount)}`);
    return this.succeed();
  }
}

@step()
class Ship extends Step {
  constructor(@input("receipt", string) private readonly receipt: string) {
    super();
  }

  override run(@contributor() contributor: Contributor): Outcome {
    contributor.contribute("shipped", `after ${this.receipt}`);
    return this.succeed();
  }
}

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge", retryBudget: 2 })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {}

export default (async () => {
  const executor = new LocalExecutor();
  const orders = Orders.build();

  const paid = await executor.run(orders.instance({ amount: 40 }));
  assert.ok(paid.isSucceeded());
  assert.deepEqual(paid.output({ shipped: string }), {
    shipped: "after charged 40",
  });

  const free = await executor.run(orders.instance({ amount: 0 }));
  assert.ok(free.isFailed());
  assert.equal(free.failure?.cause, "retries exhausted");
  assert.deepEqual(free.failure.reason, { code: "nothing to charge" });
})();
```

## The parts of a workflow

- A **step** holds one business rule: a class extending `Step` that requests the data it needs, which the workflow supplies, runs once per attempt, and reports an outcome: success, failure or skipped. Only an attempt that succeeds commits what the step contributed. A step may have a **rescue step**, which runs when the step fails or terminates abnormally and, once it succeeds, lets the step run again. See [`itinera/step`](https://itinera-dev.org/itinera-ts/modules/itinera_step.html).
- A **workflow** lists its steps in the order they run, with their retry budgets and step policies, its workflow policies, its input adapters, its service providers, the roles it provides, its ID generator and its reporters. It is declared once, before any journey, and building a workflow whose declaration breaks a rule of the specification throws `Violations`. See [`itinera/workflow`](https://itinera-dev.org/itinera-ts/modules/itinera_workflow.html).
- A **step policy** holds flow control for the steps it is attached to. Its hooks, `on step success`, `on step failure`, `on step retry` and `on step abnormal termination`, are called in response to a step's outcome, and may end the journey early. See [`itinera/policy`](https://itinera-dev.org/itinera-ts/modules/itinera_policy.html).
- A **workflow policy** acts when the journey ends: its hooks, `on workflow success` and `on workflow failure`, are called before the result is produced, and what they contribute is part of the journey's output. Any hook may use a role, an interface of operations the workflow provides, such as sending a notification. See [`itinera/policy`](https://itinera-dev.org/itinera-ts/modules/itinera_policy.html).
- What happens in a journey is recorded as **events**, which the journey's reporters receive, together with the journey's **global metadata**: entries of a key and a value, apart from the data bag, starting with the journey ID. See [`itinera/event`](https://itinera-dev.org/itinera-ts/modules/itinera_event.html) and [`itinera/report`](https://itinera-dev.org/itinera-ts/modules/itinera_report.html).
- A **service** is an object of operations a step uses to do its business, such as a payment gateway. The step requests it by key and service type, and a service provider of the workflow makes it, for the journey or for each attempt. See [`itinera/service`](https://itinera-dev.org/itinera-ts/modules/itinera_service.html).
- A **workflow instance** is made for each journey, with its initial data, its reporters and any initial global metadata, and an **executor** runs it to a **result**: the journey succeeded, failed or was aborted. See [`itinera/instance`](https://itinera-dev.org/itinera-ts/modules/itinera_instance.html), [`itinera/executor`](https://itinera-dev.org/itinera-ts/modules/itinera_executor.html) and [`itinera/journey`](https://itinera-dev.org/itinera-ts/modules/itinera_journey.html).

## What each subpath holds

The package root exports nothing of its own. Each concept is imported from a subpath of its own:

| Subpath | What it holds |
|---|---|
| `itinera/workflow` | The base class every workflow extends, how its steps are declared, and the builder |
| `itinera/step` | Steps, their attempts, their outcomes and the reasons they give |
| `itinera/policy` | Step policies and workflow policies, their hooks, and the roles they request |
| `itinera/service` | Services a workflow lends its steps, and the providers that make them |
| `itinera/journey` | Journeys, their data, how they end, and the result they give |
| `itinera/instance` | Workflow instances, one per journey |
| `itinera/executor` | Executors, which run journeys, and what `run` rejects with when it refuses an instance |
| `itinera/event` | Events, the record of what happens in a journey |
| `itinera/closed-set` | The types of the closed sets of names, such as the kinds of events and the hooks |
| `itinera/report` | Reporters, which receive the events, and dispatchers, which deliver them |
| `itinera/value` | Values, the only data a journey holds, and the type tokens that check them |
| `itinera/schema` | Zod, which the type tokens are built on, for an application's own schemas |
| `itinera/option` | `Option`, `Some` and `None` |
| `itinera/testing` | Test support, for an application's own tests |
| `itinera/unstable` | API that may still change, empty while every part of itinera is stable |

## Learning more

- [The Itinera book for TypeScript](https://itinera-dev.org/book/typescript/) teaches Itinera from a first workflow onwards, and every example in it compiles and runs.
- [The API reference](https://itinera-dev.org/itinera-ts/) documents every item of every subpath, each with an example.
- [The Itinera site](https://itinera-dev.org/) explains why Itinera exists.
- [The specification](https://github.com/itinera-dev/spec) defines what every implementation of Itinera does.
- [The changelog](https://github.com/itinera-dev/itinera-ts/blob/main/CHANGELOG.md) says what each version changed, and which specification version, tier, capabilities and conformance cases it implements.
- [The repository](https://github.com/itinera-dev/itinera-ts) holds the source, the conformance runner and the contributor guide.

## Status

`0.1.0-beta.5`, the first release, implements tier 1 of specification 0.1.0, with the capabilities `async`, `testing` and `value-conversions`, and passes the conformance cases `v0.1.0-rc.16`. It is a beta, not yet meant for production: until `0.1.0`, features may be added and its API may still change. The [changelog](https://github.com/itinera-dev/itinera-ts/blob/main/CHANGELOG.md) says what each release implements, and each [GitHub release](https://github.com/itinera-dev/itinera-ts/releases) carries the report of the conformance cases it passes.

## Rules made impossible to express

The specification lets an implementation make some rules impossible to express rather than check them while a workflow runs. In TypeScript, these mistakes do not compile:

- a hook returning a lifecycle it may not return;
- a policy needing a role the workflow does not provide;
- a rescue step that skips;
- a service provider returning anything but what `this.provide(...)` makes;
- an input adapter writing to the data bag.

## Contributing

The [contributor guide](https://github.com/itinera-dev/itinera-ts/blob/main/docs/contributing.md) says how work arrives in the repository, how itinera-ts is put together, how to build and test it and how to run the conformance cases. Itinera is built with AI under the terms of [A manifesto for software engineering with AI](https://marlon-sousa.com/blog/manifesto/); see [how Itinera is built](https://github.com/itinera-dev/.github/blob/main/CONTRIBUTING.md#how-itinera-is-built).

## Licence

Licensed under either of the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0) or the [MIT license](https://opensource.org/licenses/MIT), at your option.

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
