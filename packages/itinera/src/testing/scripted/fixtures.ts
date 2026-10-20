import { orders, serviced } from "../../engine/fixtures.js";
import type { WorkflowInstance } from "../../instance.js";
import { contributor } from "../../journey.js";
import type { StepClass } from "../../step.js";
import type { StepBuilder } from "../../step/builder.js";
import { stepReporter } from "../../step/request.js";
import { Ending } from "../ending.js";
import { rescueStepMock } from "../rescue-step-mock.js";
import { stepMock } from "../step-mock.js";

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
