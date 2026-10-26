import assert from "node:assert/strict";
import type { Event } from "itinera/event";
import type { JourneyId } from "itinera/journey";
import type { Reporter } from "itinera/report";
import { type Outcome, Step, step } from "itinera/step";
import { withStep, Workflow, workflow } from "itinera/workflow";

@step()
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

class Audit implements Reporter {
  readonly events: Event[] = [];

  report(event: Event): void {
    this.events.push(event);
  }
}

@workflow({ name: "orders", reporters: [Audit] })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {}

class Tagged implements Reporter {
  constructor(readonly journeyId: JourneyId) {}

  report(event: Event): void {
    assert.equal(event.journeyId, this.journeyId);
  }
}

function tagged(journeyId: JourneyId): Reporter {
  return new Tagged(journeyId);
}

const instance = Orders.build().instance(new Map([["order", "1"]]), {
  reporters: [tagged],
  reportersGlobalMetadata: { tenant: "acme" },
});

const [audit, reporter] = instance.takeReporters();
assert.ok(audit instanceof Audit);
assert.ok(reporter instanceof Tagged);
assert.equal(reporter.journeyId, instance.journeyId);
assert.deepEqual(instance.takeReporters(), []);
assert.deepEqual([...instance.takeGlobalMetadata()], [["tenant", "acme"]]);
