import { type Outcome, Step, step } from "../../src/step.js";
import { RescueStep, rescueStep, type RescueOutcome } from "../../src/step/rescue.js";

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

/** A rescue step declared with `@rescueStep` that always succeeds. */
@rescueStep()
export class Refund extends RescueStep {
  override run(): RescueOutcome {
    return this.succeed();
  }
}
