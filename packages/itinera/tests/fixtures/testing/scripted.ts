import { orders, serviced } from "../engine.js";
import type { WorkflowInstance } from "../../../src/instance.js";
import { contributor } from "../../../src/journey.js";
import type { StepClass } from "../../../src/step.js";
import type { StepBuilder } from "../../../src/step/builder.js";
import { stepReporter } from "../../../src/step/request.js";
import { Ending } from "../../../src/testing/ending.js";
import { rescueStepMock } from "../../../src/testing/rescue-step-mock.js";
import { stepMock } from "../../../src/testing/step-mock.js";

/**
 * The step `name`, `charge` unless named, which succeeds when it runs for
 * real, and whose `run` requests a contributor and a step reporter.
 */
export function charge(name = "charge"): StepBuilder<StepClass> {
  return serviced([]).builder(name).run(contributor(), stepReporter());
}

/**
 * {@link charge}, named `name`, with the rescue step `<name>_rescue`, which
 * succeeds.
 */
export function rescued(name = "charge"): StepBuilder<StepClass> {
  return charge(name).rescue(
    rescueStepMock({ attempts: [Ending.success] }).builder(),
  );
}

/**
 * A new instance of the workflow `orders` whose steps are `charging`, then
 * `ship`, which succeeds and requests nothing.
 */
export function shop(
  charging: StepBuilder<StepClass> = charge(),
): WorkflowInstance {
  return orders(
    charging,
    stepMock({ attempts: [Ending.success] }).builder("ship"),
  ).instance();
}
