import assert from "node:assert/strict";
import {
  DefaultDispatcherFactory,
  type Event,
  type Reporter,
} from "itinera/unstable";
import { type PlainValue } from "itinera/value";

class Keeping implements Reporter {
  readonly entries: string[] = [];

  receiveGlobalMetadata(key: string, value: PlainValue): void {
    this.entries.push(`${key}=${JSON.stringify(value)}`);
  }

  report(event: Event): void {
    this.entries.push(event.kind);
  }
}

export default (async () => {
  const first = new Keeping();
  const second = new Keeping();
  const dispatcher = new DefaultDispatcherFactory().create();
  dispatcher.add(first);
  dispatcher.add(second);
  await dispatcher.setGlobalMetadata("tenant", "acme");
  assert.deepEqual(first.entries, ['tenant="acme"']);
  assert.deepEqual(second.entries, ['tenant="acme"']);
})();
