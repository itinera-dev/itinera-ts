import type { ContributionSource, Event } from "itinera/unstable";

function author(source: ContributionSource): string {
  switch (source.kind) {
    case "step":
      return `${source.step}, attempt ${source.attempt.toString()}`;
    case "step hook":
      return `${source.policy}, ${source.hook}, for ${source.step}`;
    case "workflow hook":
      return `${source.policy}, ${source.hook}`;
  }
}

export function committed(event: Event): string | undefined {
  return event.kind === "contribution_committed"
    ? `${event.key} from ${author(event.source)}`
    : undefined;
}
