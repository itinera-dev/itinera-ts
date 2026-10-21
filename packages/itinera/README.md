# itinera

The TypeScript implementation of [Itinera](https://itinera-dev.org/), a workflow framework that keeps business rules separate from flow control.

A workflow is a list of steps. Each step holds one piece of business logic and says only how it ended: it succeeded, it failed with a reason, or it was skipped. Everything around the steps, such as retrying a failed attempt, passing data from one step to the next, lending a step the services it needs, and telling every reporter what happened, is the executor's work, done the same way for every workflow. Policies attached to a step or to the whole workflow change those decisions in one place, without touching the steps.

## Installing it

```sh
npm install itinera reflect-metadata
```

itinera runs on Node 22.12 and later, and works with `import` and `require` alike. It uses only the language and the web platform, so it also runs on Deno and Bun, and in browsers through a bundler; in a browser, the default journey IDs need a secure context.

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
| `itinera/report` | Reporters, which receive the events, and dispatchers, which deliver them |
| `itinera/value` | Values, the only data a journey holds, and the type tokens that check them |
| `itinera/schema` | Zod, which the type tokens are built on, for an application's own schemas |
| `itinera/option` | `Option`, `Some` and `None` |
| `itinera/testing` | Test support, for an application's own tests |
| `itinera/unstable` | API that may still change, empty while every part of itinera is stable |

## Learning more

- [The API reference](https://itinera-dev.org/api/typescript/) documents every item of every subpath, each with an example.
- [The Itinera site](https://itinera-dev.org/) explains why Itinera exists.
- [The specification](https://github.com/itinera-dev/spec) defines what every implementation of Itinera does.
- [The changelog](https://github.com/itinera-dev/itinera-ts/blob/main/CHANGELOG.md) says what each version changed, and which specification version, tier, capabilities and conformance cases it implements.
- [The repository](https://github.com/itinera-dev/itinera-ts) holds the source, the conformance runner and the contributor guide.

## License

Licensed under either of the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0) or the [MIT license](https://opensource.org/licenses/MIT), at your option.
