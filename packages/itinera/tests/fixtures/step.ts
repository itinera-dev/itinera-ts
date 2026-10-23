import { type Outcome, Step, step } from "../../src/step.js";

/** A step declared with `@step` that always succeeds. */
@step()
export class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

/** Another step declared with `@step` that always succeeds. */
@step()
export class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}
