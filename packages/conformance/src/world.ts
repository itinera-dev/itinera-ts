import { Model } from "./model.js";

/** What the runner keeps for one scenario while its sentences run, made new for each. */
export class World {
  /** What the scenario's Given sentences declare. */
  readonly model = new Model();
}
