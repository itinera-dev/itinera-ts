import { closedSet, type ValueOf } from "../closed-set.js";

/**
 * What a mistake in a test is, each written in words, such as
 * `"attempt left out"`.
 *
 * {@includeCode ../../examples/test-mistake.ts}
 */
export const MistakeKind = closedSet({
  /** The script names a step the workflow does not have. */
  UnknownStep: "unknown step",
  /** The script names a step it named before. */
  StepScriptedTwice: "step scripted twice",
  /** The script describes an attempt before describing the one before it. */
  GapInTheAttempts: "gap in the attempts",
  /** The script describes an attempt it described before. */
  AttemptScriptedTwice: "attempt scripted twice",
  /** The script describes an attempt the step can never have. */
  NoSuchAttempt: "no such attempt",
  /** The script makes a rescue step skip, which a rescue step cannot do. */
  RescueStepSkips: "rescue step skips",
  /** The script contributes for a step that declares no contributor. */
  NoContributor: "no contributor",
  /**
   * The script emits, or sets global metadata, for a step that declares no
   * reporter.
   */
  NoReporter: "no reporter",
  /** The script leaves out an attempt a scripted step can have. */
  AttemptLeftOut: "attempt left out",
  /**
   * The script leaves out the rescue step of a scripted step that can fail
   * on attempt 1.
   */
  RescueStepLeftOut: "rescue step left out",
  /** The test asked for every step to be scripted, and one is not. */
  StepLeftOut: "step left out",
  /** A fake is named after a service provider the workflow does not have. */
  UnknownProvider: "unknown provider",
  /** A fake makes another service than its service provider makes. */
  AnotherService: "another service",
});

/**
 * One of the values of {@link MistakeKind}.
 *
 * {@includeCode ../../examples/test-mistake.ts}
 */
export type MistakeKind = ValueOf<typeof MistakeKind>;

/**
 * One mistake in a test: its kind, with the step, the attempt or the
 * service provider it concerns, as the test named them.
 *
 * {@includeCode ../../examples/test-mistake.ts}
 */
export type Mistake =
  | {
      /** Tells this mistake from the others. */
      readonly kind:
        | "unknown step"
        | "step scripted twice"
        | "rescue step skips"
        | "no contributor"
        | "no reporter"
        | "step left out";
      /** The step, or rescue step, concerned. */
      readonly step: string;
    }
  | {
      /** Tells this mistake from the others. */
      readonly kind:
        | "gap in the attempts"
        | "attempt scripted twice"
        | "no such attempt"
        | "attempt left out";
      /** The step, or rescue step, concerned. */
      readonly step: string;
      /**
       * The attempt concerned: the one described out of order, or the first
       * one left out, since those after it depend on how it ends.
       */
      readonly attempt: number;
    }
  | {
      /** Tells this mistake from the others. */
      readonly kind: "rescue step left out";
      /** The rescue step left out. */
      readonly step: string;
      /** The step it rescues, which can fail on attempt 1. */
      readonly rescued: string;
    }
  | {
      /** Tells this mistake from the others. */
      readonly kind: "unknown provider" | "another service";
      /** The service provider the fake is named after. */
      readonly provider: string;
    };

/**
 * A mistake in a test, found before its journey starts: thrown where the
 * mistake is written, or when a scripted run starts, never a refusal, and
 * with no event emitted. Its message names each problem, and `problems`
 * holds them.
 *
 * {@includeCode ../../examples/test-mistake.ts}
 */
export class TestMistake extends Error {
  /** Every problem found, in the order found. */
  readonly problems: readonly Mistake[];

  /** The mistake of a test that has `problems`. */
  constructor(problems: readonly [Mistake, ...Mistake[]]) {
    super(`the test is mistaken: ${problems.map(described).join("; ")}`);
    this.name = "TestMistake";
    this.problems = Object.freeze([...problems]);
  }
}

function described(mistake: Mistake): string {
  switch (mistake.kind) {
    case MistakeKind.UnknownStep:
      return `the workflow has no step ${mistake.step}`;
    case MistakeKind.StepScriptedTwice:
      return `${mistake.step} is scripted twice`;
    case MistakeKind.RescueStepSkips:
      return `${mistake.step} is a rescue step, which cannot skip`;
    case MistakeKind.NoContributor:
      return `${mistake.step} declares no contributor, so it cannot contribute`;
    case MistakeKind.NoReporter:
      return `${mistake.step} declares no reporter, so it cannot emit or set global metadata`;
    case MistakeKind.StepLeftOut:
      return `${mistake.step} is left out, though every step must be scripted`;
    case MistakeKind.GapInTheAttempts:
      return `attempt ${mistake.attempt.toString()} of ${mistake.step} is described before the attempt before it`;
    case MistakeKind.AttemptScriptedTwice:
      return `attempt ${mistake.attempt.toString()} of ${mistake.step} is described twice`;
    case MistakeKind.NoSuchAttempt:
      return `${mistake.step} can have no attempt ${mistake.attempt.toString()}`;
    case MistakeKind.AttemptLeftOut:
      return `attempt ${mistake.attempt.toString()} of ${mistake.step} is left out`;
    case MistakeKind.RescueStepLeftOut:
      return `${mistake.step} is left out, though ${mistake.rescued} can fail on attempt 1`;
    case MistakeKind.UnknownProvider:
      return `the workflow has no service provider ${mistake.provider}`;
    case MistakeKind.AnotherService:
      return `the fake of ${mistake.provider} makes another service than the provider`;
  }
}
