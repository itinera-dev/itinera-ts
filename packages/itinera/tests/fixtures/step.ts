import { type Outcome, Step, step } from "../../src/step.js";
import {
  RescueStep,
  rescueStep,
  type RescueOutcome,
} from "../../src/step/rescue.js";

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

/**
 * A step that keeps static data, which neither `@step` nor its builder
 * accepts.
 */
export class Counter extends Step {
  static attempts = 0;

  override run(): Outcome {
    return this.succeed();
  }
}

/**
 * A rescue step that keeps static data, which neither `@rescueStep` nor its
 * builder accepts.
 */
export class Recount extends RescueStep {
  static rescues = 0;

  override run(): RescueOutcome {
    return this.succeed();
  }
}
