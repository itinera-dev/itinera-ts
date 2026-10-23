import type { Event } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { Reporter } from "../report.js";
import type { PlainValue } from "../value.js";

/** The first failure of any reporter of the journey, once one failed. */
export class Failures {
  #first: { readonly error: unknown } | undefined;

  /** What the first reporter that failed threw, if one failed. */
  get first(): { readonly error: unknown } | undefined {
    return this.#first;
  }

  /** Keeps what a reporter threw, unless one failed before. */
  record(error: unknown): void {
    this.#first ??= { error };
  }
}

/**
 * Stands between the dispatcher and one reporter of the journey, so that the
 * rules on a reporter that fails hold whatever the dispatcher does. Once any
 * reporter failed, it lets nothing through but `journey_aborted`, and nothing
 * at all to its own reporter if that one failed. A failure on
 * `journey_aborted` is ignored, so that delivery goes on to the reporters
 * after it.
 */
export class Guard implements Reporter {
  #failed = false;

  constructor(
    private readonly reporter: Reporter,
    private readonly failures: Failures,
  ) {}

  async report(event: Event): Promise<void> {
    if (event.kind === EventKind.JourneyAborted) {
      await this.#unlessFailedIgnoring(event);
    } else if (this.failures.first === undefined) {
      await this.#recording(() => this.reporter.report(event));
    }
  }

  async receiveGlobalMetadata(key: string, value: PlainValue): Promise<void> {
    if (this.failures.first === undefined) {
      await this.#recording(() =>
        this.reporter.receiveGlobalMetadata?.(key, value),
      );
    }
  }

  async #unlessFailedIgnoring(event: Event): Promise<void> {
    if (this.#failed) {
      return;
    }
    try {
      await this.reporter.report(event);
    } catch {
      // The journey is aborted already, and the reporters after it still receive the event.
    }
  }

  async #recording(call: () => void | Promise<void>): Promise<void> {
    try {
      await call();
    } catch (error) {
      this.#failed = true;
      this.failures.record(error);
      throw error;
    }
  }
}
