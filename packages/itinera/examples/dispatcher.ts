import assert from "node:assert/strict";
import type { Dispatcher, Event, Reporter } from "itinera/unstable";
import type { PlainValue } from "itinera/value";

class OnlyMine implements Dispatcher {
  constructor(private readonly mine: Reporter) {}

  add(): void {
    // The workflow's reporters are left out: only this dispatcher's own hears the journey.
  }

  async dispatch(event: Event): Promise<void> {
    await this.mine.report(event);
  }

  async setGlobalMetadata(key: string, value: PlainValue): Promise<void> {
    await this.mine.receiveGlobalMetadata?.(key, value);
  }
}

class Tenant implements Reporter {
  tenant: PlainValue = null;

  receiveGlobalMetadata(key: string, value: PlainValue): void {
    if (key === "tenant") this.tenant = value;
  }

  report(): void {
    // Events are not this reporter's concern.
  }
}

export default (async () => {
  const mine = new Tenant();
  const dispatcher = new OnlyMine(mine);
  await dispatcher.setGlobalMetadata("tenant", "acme");
  assert.equal(mine.tenant, "acme");
})();
