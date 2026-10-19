import { requestsOf } from "../../declaration.js";
import { requestsGiven } from "../../declaration/marking.js";
import type { Place } from "../../declaration/parameter.js";
import type { Tokens } from "../../declaration/token.js";
import type { Request } from "../../declaration/request.js";
import type { Rescue } from "../descriptor.js";
import { requestsOfRescue, type RescueStepClass } from "../rescue.js";

let starting: <C extends RescueStepClass>(rescue: C) => RescueStepBuilder<C>;
let describing: <C extends RescueStepClass>(
  builder: RescueStepBuilder<C>,
) => Omit<Rescue, "name">;

/**
 * Puts a rescue step of the class `C` together for a step's builder, which
 * takes it in its `rescue`: started by the rescue step class's static
 * `builder()`. A rescue step class declared without decorators is given its
 * requests by position, with `needs` and `run`.
 *
 * {@includeCode ../../../examples/rescue-step.ts}
 *
 * @typeParam C The class of the rescue step.
 */
export class RescueStepBuilder<C extends RescueStepClass> {
  static {
    starting = (rescue) => new RescueStepBuilder(rescue);
    describing = (builder) => builder.#describe();
  }

  readonly #rescue: C;
  #needs: readonly Request[] | undefined;
  #run: readonly Request[] | undefined;

  private constructor(rescue: C) {
    this.#rescue = rescue;
  }

  /**
   * The requests of the rescue step's constructor, one per parameter in
   * order, such as `fromRescuedStep("amount", integer)`, each with its type
   * written.
   *
   * @throws Error if the class declares its requests with decorators, or if
   * a parameter is left without a request.
   */
  needs(
    ...requests: Tokens<ConstructorParameters<C>, Place<C, undefined>>
  ): this {
    this.#needs = requestsGiven(this.#rescue, undefined, requests);
    return this;
  }

  /**
   * The requests of the rescue step's `run`, one per parameter in order,
   * such as `contributor()`.
   *
   * @throws Error if the class declares its requests with decorators, or if
   * a parameter is left without a request.
   */
  run(
    ...requests: Tokens<
      Parameters<InstanceType<C>["run"]>,
      Place<InstanceType<C>, "run">
    >
  ): this {
    this.#run = requestsGiven(this.#rescue, "run", requests);
    return this;
  }

  #describe(): Omit<Rescue, "name"> {
    return {
      step: this.#rescue,
      requests: requestsOfRescue(this.#rescue) ?? {
        needs: this.#needs ?? requestsOf(this.#rescue, undefined),
        run: this.#run ?? requestsOf(this.#rescue, "run"),
      },
    };
  }
}

/** The builder of a rescue step of the class `rescue`. */
export function rescueStepBuilder<C extends RescueStepClass>(
  rescue: C,
): RescueStepBuilder<C> {
  return starting(rescue);
}

/**
 * The rescue step `rescue` gives a step: a class declared with
 * `@rescueStep`, or what a rescue step's builder has put together.
 *
 * @throws Error if the class is not declared with `@rescueStep`, or if a
 * parameter of its constructor or of its `run` has no request.
 */
export function rescueGiven<C extends RescueStepClass>(
  rescue: C | RescueStepBuilder<C>,
): Omit<Rescue, "name"> {
  if (rescue instanceof RescueStepBuilder) {
    return describing(rescue);
  }
  const requests = requestsOfRescue(rescue);
  if (requests === undefined) {
    throw new Error(`${rescue.name} is not declared with @rescueStep`);
  }
  return { step: rescue, requests };
}
