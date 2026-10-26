import {
  type Outcome,
  Step,
  type StepBuilder,
  type StepClass,
} from "../step.js";
import { Ending } from "./ending.js";

/**
 * What a step mock does: how each of its attempts ends, whether it ends
 * asynchronously, and whether it cannot be built.
 *
 * {@includeCode ../../examples/step-mock.ts}
 */
export interface StepMockScript {
  /**
   * How each attempt ends, the first attempt's first; the last ending is
   * played again by every attempt after it.
   */
  readonly attempts: readonly [Ending, ...Ending[]];
  /**
   * `true` for a `run` that gives its outcome through a promise, settled
   * after the current turn, rather than at once.
   */
  readonly asynchronous?: boolean;
  /**
   * The message of the error its constructor throws, when the step cannot
   * be built.
   */
  readonly buildFailure?: string;
}

/**
 * A class extending {@link StepMock}, whose `builder(name)` starts a step for
 * a workflow's builder, as any step class's does.
 *
 * {@includeCode ../../examples/step-mock.ts}
 */
export interface StepMockClass {
  /** Builds the step mock for its next attempt. */
  new (): StepMock;
  /** The prototype every step mock of the class shares. */
  readonly prototype: StepMock;
  /** Starts putting a step of the class together for a workflow's builder. */
  builder<C extends StepClass>(this: C, name: string): StepBuilder<C>;
}

/**
 * The base class of the step mocks {@link stepMock} makes: a step that plays
 * its script, ending each attempt through an {@link Ending}, so that it ends
 * exactly as a real step would.
 *
 * {@includeCode ../../examples/step-mock.ts}
 */
export abstract class StepMock extends Step {
  readonly #ending: Ending;
  readonly #asynchronous: boolean;

  /** Builds the step mock that ends its attempt with `ending`. */
  protected constructor(ending: Ending, asynchronous: boolean) {
    super();
    this.#ending = ending;
    this.#asynchronous = asynchronous;
  }

  /** Ends the attempt as its script says. */
  override run(): Outcome | Promise<Outcome> {
    const ending = this.#ending;
    return this.#asynchronous
      ? Promise.resolve(ending).then(Ending.outcome)
      : Ending.outcome(ending);
  }
}

/**
 * A new class of step mock playing the script, whose `builder(name)` starts a
 * step for a workflow's builder, as any step class's does. The class counts the steps built from it as the
 * attempts of its script, so each workflow takes a class of its own.
 *
 * {@includeCode ../../examples/step-mock.ts}
 */
export function stepMock(script: StepMockScript): StepMockClass {
  const { attempts, asynchronous = false, buildFailure } = script;
  const endings: readonly [Ending, ...Ending[]] = [...attempts];
  let built = 0;
  return class extends StepMock {
    constructor() {
      if (buildFailure !== undefined) {
        throw new Error(buildFailure);
      }
      super(
        endings[Math.min(built, endings.length - 1)] ?? endings[0],
        asynchronous,
      );
      built += 1;
    }
  };
}
