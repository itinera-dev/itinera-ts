import type { WithoutStaticData } from "../declaration/static-data.js";
import { RescueStep, type RescueOutcome } from "../step/rescue.js";
import type { RescueStepBuilder } from "../step/rescue/builder.js";
import type { RescueStepClass } from "../step/rescue.js";
import { failure, success } from "../step/outcome.js";
import type { RescueEnding } from "./ending.js";

/**
 * What a rescue step mock does: how it ends, whether it ends asynchronously,
 * and whether it cannot be built.
 *
 * {@includeCode ../../examples/rescue-step-mock.ts}
 */
export interface RescueStepMockScript {
  /**
   * How each rescue step built from the class ends, the first one's first;
   * the last ending is played again by every one after it. A rescue step
   * has one attempt per rescue, so a workflow whose step is rescued once
   * plays only the first.
   */
  readonly attempts: readonly [RescueEnding, ...RescueEnding[]];
  /**
   * `true` for a `run` that gives its outcome through a promise, settled
   * after the current turn, rather than at once.
   */
  readonly asynchronous?: boolean;
  /**
   * The message of the error its constructor throws, when the rescue step
   * cannot be built.
   */
  readonly buildFailure?: string;
}

/**
 * A class extending {@link RescueStepMock}, whose `builder()` starts a rescue
 * step for a step's builder, as any rescue step class's does.
 *
 * {@includeCode ../../examples/rescue-step-mock.ts}
 */
export interface RescueStepMockClass {
  /**
   * Builds the rescue step mock, given what its constructor requests, in
   * order.
   */
  new (...needs: unknown[]): RescueStepMock;
  /** The prototype every rescue step mock of the class shares. */
  readonly prototype: RescueStepMock;
  /** Starts putting a rescue step of the class together for a step's builder. */
  builder<C extends RescueStepClass>(
    this: WithoutStaticData<C, typeof RescueStep>,
  ): RescueStepBuilder<C>;
}

/**
 * The base class of the rescue step mocks {@link rescueStepMock} makes: a
 * rescue step that plays its script, ending through a {@link RescueEnding},
 * so that it ends exactly as a real rescue step would, and keeps what it was
 * built with.
 *
 * {@includeCode ../../examples/rescue-step-mock.ts}
 */
export abstract class RescueStepMock extends RescueStep {
  readonly #ending: RescueEnding;
  readonly #asynchronous: boolean;
  /**
   * What it was built with, in the order its constructor requests it: each
   * input's value, each value from the step it rescues, the failure's reason
   * and the error, or an `Option` of one for an optional request.
   */
  readonly inputs: readonly unknown[];

  /**
   * Builds the rescue step mock that ends its attempt with `ending`, given
   * `inputs`.
   */
  protected constructor(
    ending: RescueEnding,
    asynchronous: boolean,
    inputs: readonly unknown[],
  ) {
    super();
    this.#ending = ending;
    this.#asynchronous = asynchronous;
    this.inputs = inputs;
  }

  /** Ends the attempt as its script says. */
  override run(): RescueOutcome | Promise<RescueOutcome> {
    const ending = this.#ending;
    return this.#asynchronous
      ? Promise.resolve(ending).then(rescueOutcome)
      : rescueOutcome(ending);
  }
}

/**
 * A new class of rescue step mock playing the script, whose `builder()`
 * starts a rescue step for a step's builder, as any rescue step class's
 * does. The class counts the rescue steps built from it, so each workflow
 * takes a class of its own. Its constructor takes anything, which the rescue
 * step's builder requests with `needs`, and keeps it.
 *
 * {@includeCode ../../examples/rescue-step-mock.ts}
 */
export function rescueStepMock(
  script: RescueStepMockScript,
): RescueStepMockClass {
  const { attempts, asynchronous = false, buildFailure } = script;
  const endings: readonly [RescueEnding, ...RescueEnding[]] = [...attempts];
  let built = 0;
  return class extends RescueStepMock {
    constructor(...inputs: unknown[]) {
      if (buildFailure !== undefined) {
        throw new Error(buildFailure);
      }
      super(
        endings[Math.min(built, endings.length - 1)] ?? endings[0],
        asynchronous,
        inputs,
      );
      built += 1;
    }
  };
}

/**
 * The outcome a rescue step's `run` returns to end as `ending` says.
 *
 * @throws Error carrying the message, for an abnormal termination.
 */
function rescueOutcome(ending: RescueEnding): RescueOutcome {
  switch (ending.kind) {
    case "success":
      return success;
    case "failure":
      return failure(ending.reason);
    case "abnormal termination":
      throw new Error(ending.errorMessage);
  }
}
