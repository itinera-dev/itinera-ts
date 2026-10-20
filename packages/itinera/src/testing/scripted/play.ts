import type { Lent, Play, Script } from "../../engine/script.js";
import type { Attempt, Outcome, StepName } from "../../step.js";
import { Ending } from "../ending.js";
import type { Built } from "./record.js";
import { type Action, namedAs, type Played, type Target } from "./target.js";

/**
 * What the engine plays for the script of `targets`, recording in `built`
 * every attempt handed to the construction of its step.
 */
export function playing(targets: readonly Target[], built: Built[]): Script {
  return {
    building: (step, attempt, values) => {
      built.push({ step, attempt, values });
    },
    play: (step, attempt) => playOf(targets, step, attempt),
  };
}

function playOf(
  targets: readonly Target[],
  step: StepName,
  attempt: Attempt,
): Play | undefined {
  const described = targets.find(namedAs(step))?.described(attempt.number);
  return described?.kind === "played"
    ? (lent) => played(described, lent)
    : undefined;
}

async function played(described: Played, lent: Lent): Promise<Outcome> {
  for (const action of described.actions) {
    await act(action, lent);
  }
  return Ending.outcome(described.ending);
}

async function act(action: Action, lent: Lent): Promise<void> {
  switch (action.kind) {
    case "contribute":
      lent.contributor.contribute(action.key, action.value);
      return;
    case "emit":
      return lent.reporter[action.level](action.message, action.data);
    case "set global metadata":
      return lent.reporter.setGlobalMetadata(action.key, action.value);
  }
}
