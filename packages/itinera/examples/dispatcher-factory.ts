import assert from "node:assert/strict";
import { DefaultDispatcher, type DispatcherFactory } from "itinera/report";

class Counting implements DispatcherFactory {
  created = 0;

  create(): DefaultDispatcher {
    this.created += 1;
    return new DefaultDispatcher();
  }
}

const factory = new Counting();
assert.notEqual(factory.create(), factory.create());
assert.equal(factory.created, 2);
