import type { ContributionSource } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { PlainValue } from "../value.js";
import type { Journey } from "./journey.js";

/**
 * Commits each contribution `source` made to the data bag, in order,
 * reporting each, and each value it replaced.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function committed(
  journey: Journey,
  source: ContributionSource,
  contributed: ReadonlyMap<string, PlainValue>,
): Promise<void> {
  for (const [key, value] of contributed) {
    const replaced = journey.commit(key, value);
    await journey.emit({ kind: EventKind.ContributionCommitted, key, source });
    if (replaced) {
      await journey.emit({ kind: EventKind.DataOverwritten, key, source });
    }
  }
}
