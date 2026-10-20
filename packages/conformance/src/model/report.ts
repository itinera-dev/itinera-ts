import { EventKind } from "itinera/unstable";
import { ModelError } from "./error.js";

/** How a scripted reporter fails, as test support's failing reporter does. */
export type { ReporterFailure } from "itinera/unstable";

/**
 * What the executor is given to dispatch events: unstated, which is the
 * runner's recording dispatcher factory, the default dispatcher, a
 * dispatcher holding a reporter of the scenario, or a factory that fails.
 */
export type Dispatching =
  | { readonly kind: "unstated" }
  | { readonly kind: "default" }
  | {
      readonly kind: "holding";
      readonly reporter: string;
      readonly holding: Holding;
    }
  | { readonly kind: "failing factory" };

/**
 * What a dispatcher holding a reporter of the scenario does with the
 * reporters the executor adds, and with the events it dispatches.
 */
export type Holding =
  | { readonly kind: "adds reporters" }
  | { readonly kind: "ignores added reporters" }
  | { readonly kind: "fails when adding" }
  | { readonly kind: "fails dispatching"; readonly event: EventKind };

/** Reads the kind of an event of the catalogue. */
export function eventKind(name: string): EventKind {
  if (!EventKind.has(name)) {
    throw new ModelError(`"${name}" is not an event of the catalogue`);
  }
  return name;
}
