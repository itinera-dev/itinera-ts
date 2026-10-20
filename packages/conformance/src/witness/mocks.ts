/** The classes of mocks the witness makes, and the mocks they build. */
import type { Contributor } from "itinera/journey";
import type { Outcome, RescueOutcome, StepReporter } from "itinera/step";
import type {
  RescueStepMock,
  RescueStepMockClass,
  StepMock,
  StepMockClass,
} from "itinera/testing";

/**
 * A class of step mocks whose `run` requests the attempt's contributor and
 * step reporter, then the services the step requests, by position, to play
 * what the scenario's step does before it ends.
 */
export type ActingClass = StepMockClass &
  (new (...inputs: unknown[]) => StepMock & {
    run(
      contributor?: Contributor,
      reporter?: StepReporter,
      ...services: unknown[]
    ): Outcome | Promise<Outcome>;
  });

/**
 * A class of rescue step mocks whose `run` requests the attempt's
 * contributor and step reporter, then the services the rescue step requests,
 * by position, as an {@link ActingClass} does.
 */
export type ActingRescueClass = RescueStepMockClass &
  (new (...needs: unknown[]) => RescueStepMock & {
    run(
      contributor?: Contributor,
      reporter?: StepReporter,
      ...services: unknown[]
    ): RescueOutcome | Promise<RescueOutcome>;
  });

/** A step mock, or a rescue step mock, that the scenario's workflow built. */
export type Mock = StepMock | RescueStepMock;
