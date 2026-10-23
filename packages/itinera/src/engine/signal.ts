import type { Abort } from "../journey.js";

/**
 * The journey-abort error: the executor's signal that the journey is
 * aborted, carrying the abort it recorded. It ends the custom code it is
 * thrown into, and the engine catches it only where it runs the journey. The
 * package never exports its class, so no application can catch it by name.
 */
export class JourneyAbortError extends Error {
  constructor(readonly abort: Abort) {
    super(`the journey was aborted: ${abort.reason}`);
  }
}
