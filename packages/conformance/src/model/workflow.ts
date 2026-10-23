import type { AdapterScript } from "./adapter.js";
import type { StepScript } from "./step.js";

/** The workflow a scenario declares. */
export interface WorkflowModel {
  readonly name: string;
  /** Its steps' names, in declaration order, each as often as declared. */
  readonly steps: readonly string[];
  /** The script of each step, and of each rescue step, once per name. */
  readonly scripts: Map<string, StepScript>;
  /** The input adapters it declares, in the order declared. */
  readonly adapters: AdapterScript[];
  /** The names of the recording reporters it lists, in order, once stated. */
  reporters?: readonly string[];
  /**
   * Where its instance's journey ID comes from, once stated; the default
   * journey ID until then.
   */
  idGenerator?: IdGenerator;
}

/** The default journey ID, a UUID v4, or one the ID generator returns. */
export type IdGenerator =
  | { readonly kind: "default" }
  | { readonly kind: "returns"; readonly id: string };
