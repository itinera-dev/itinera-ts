import type { InstanceOptions, WorkflowInstance } from "itinera/instance";
import type { Value } from "itinera/value";
import type { Built } from "itinera/workflow";
import { given } from "../given.js";
import type { Scripted } from "../model/value.js";
import type { Model } from "../model.js";
import type { Recorders } from "../recorders.js";
import type { Scenario } from "./workflow.js";

/** A reporter an instance is given, or what makes one from its journey ID. */
export type GivenReporter = NonNullable<InstanceOptions["reporters"]>[number];

/** The reporters the runner adds to an instance, before and after those the workflow lists. */
interface Added {
  readonly first?: GivenReporter | undefined;
  readonly last?: GivenReporter | undefined;
}

/**
 * A new instance of the workflow, with the initial data and global metadata
 * the scenario gives, which makes each reporter the workflow lists with its
 * journey ID, between the reporters `added` puts first and last.
 */
export function instanceOf(
  workflow: Built<Scenario>,
  model: Model,
  recorders: Recorders,
  { first, last }: Added = {},
): WorkflowInstance<Scenario> {
  const { reporters = [] } = model.workflow;
  return workflow.instance(model.initialData.map(asGiven), {
    reporters: [
      ...present(first),
      ...reporters.map((name) => recorders.makerOf(name)),
      ...present(last),
    ],
    reportersGlobalMetadata: model.initialGlobalMetadata.map(asGiven),
  });
}

function present(
  reporter: GivenReporter | undefined,
): readonly GivenReporter[] {
  return reporter === undefined ? [] : [reporter];
}

function asGiven([key, scripted]: readonly [string, Scripted]): [
  string,
  Value,
] {
  return [key, given(scripted)];
}
