import type { Event, PlainValue, Reporter } from "itinera/unstable";

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
