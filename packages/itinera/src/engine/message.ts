const unreadable = "an error whose message could not be read";

/**
 * The message of what custom code threw: its `message` for an `Error`, and
 * its text otherwise. Reading either may throw, as a `message` getter or an
 * object with no prototype does, so a fixed text stands in then, since
 * nothing may escape a journey.
 */
export function messageOf(thrown: unknown): string {
  try {
    const message: unknown = thrown instanceof Error ? thrown.message : thrown;
    return String(message);
  } catch {
    return unreadable;
  }
}
