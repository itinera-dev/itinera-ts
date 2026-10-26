import type { Event, Reporter } from "itinera/unstable";
import type { PlainValue } from "itinera/value";

export class Audit implements Reporter {
  readonly #metadata = new Map<string, PlainValue>();

  receiveGlobalMetadata(key: string, value: PlainValue): void {
    this.#metadata.set(key, value);
  }

  report(event: Event): void {
    const tenant = JSON.stringify(this.#metadata.get("tenant"));
    console.log(`${event.journeyId} ${event.kind} for ${tenant}`);
  }
}
