import type { Event } from "../event.js";
import type { Reporter } from "../report.js";

// The web platform's console, which the language's own declarations leave out.
declare const console: { log(line: string): void };

/**
 * A reporter that prints every event of a journey on a line of its own,
 * with `console.log`, as JSON: its kind, sequence number, timestamp, journey
 * ID, workflow and everything else it carries.
 *
 * It suits trying a workflow out, debugging one, and watching a test run. A
 * reporter that prints something else, or sends the events elsewhere,
 * implements {@link Reporter} itself.
 *
 * {@includeCode ../../examples/debug-reporter.ts}
 */
export class DebugReporter implements Reporter {
  /** Prints the event as JSON, on a line of its own. */
  report(event: Event): void {
    console.log(JSON.stringify(event));
  }
}
