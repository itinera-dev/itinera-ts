/**
 * What the scenario's When sentences do to call a step, a hook or an input
 * adapter alone, outside any journey, with the handles test support's
 * recorders lend, as a test calls them.
 */
import type { HookReporter } from "itinera/policy";
import type { StepName, StepReporter } from "itinera/step";
import {
  Contributions,
  HookEventReporter,
  StepEventReporter,
  TestDataBag,
} from "itinera/testing";
import type { PlainValue } from "itinera/value";
import type { Built, ListedStep, Supplied } from "itinera/workflow";
import { type Call, CarryingOn } from "./alone/carrying-on.js";
import { hookCalled } from "./alone/hook.js";
import type { AdapterRequest } from "./model/adapter.js";
import { ModelError } from "./model/error.js";
import type { TestSupport } from "./model/testing.js";
import type { Model } from "./model.js";
import { actingOf } from "./scenario/actions.js";
import { mockScriptOf } from "./scenario/mock.js";
import type { Scenario } from "./scenario/workflow.js";
import type { ActingClass, Witness } from "./witness.js";

/**
 * What a step, a hook or an input adapter called alone was lent and gave:
 * the recorders, made failing as the scenario says, the calls made on what
 * they lent, and what the input adapter returned.
 */
export class Alone {
  readonly contributions = new Contributions();
  readonly stepEvents: StepEventReporter;
  readonly hookEvents: HookEventReporter;
  readonly #carryingOn = new CarryingOn();
  #returned: Supplied | undefined;
  #called: string | undefined;

  constructor(testing: TestSupport) {
    this.stepEvents = testing.stepRecorderFails
      ? StepEventReporter.failing()
      : new StepEventReporter();
    this.hookEvents = testing.hookRecorderFails
      ? HookEventReporter.failing()
      : new HookEventReporter();
  }

  /** Every call made on the lent handles, in order. */
  get calls(): readonly Call[] {
    return this.#carryingOn.calls;
  }

  /**
   * Checks that the sentence names what was called alone, as
   * `step "charge"` or `the hook "on step success" of policy "audit"`.
   *
   * @throws ModelError when something else was called.
   */
  ensureCalled(named: string): void {
    if (named !== this.#called) {
      throw new ModelError(`${named} was not called alone`);
    }
  }

  /** What the input adapter returned, once called alone. */
  get returned(): Supplied {
    if (this.#returned === undefined) {
      throw new ModelError("no input adapter was called alone");
    }
    return this.#returned;
  }

  /**
   * Builds the scenario's step outside any journey and calls its `run`,
   * which does what the step does on attempt 1, lending it the contributions
   * recorder's contributor and the step event reporter's reporter.
   *
   * @throws ModelError when the step requests an input or a service, which
   * a step run alone is not given.
   */
  async runStep(model: Model, witness: Witness, step: string): Promise<void> {
    this.#called = `step "${step}"`;
    const script = model.step(step);
    if (script.inputs.length > 0 || script.services.length > 0) {
      throw new ModelError(
        `step "${step}" requests what a step run alone is not given`,
      );
    }
    const Acting = witness.classOf(
      step,
      mockScriptOf(script),
      actingOf(script),
      script.keepsHandles,
      [],
    );
    const built: InstanceType<ActingClass> = new Acting();
    await built.run(
      this.#carryingOn.lend(this.contributions.contributor, "contributor"),
      this.#carryingOn.lend<StepReporter>(this.stepEvents.reporter, "reporter"),
    );
  }

  /**
   * Calls the hook of the scenario's policy outside any journey, lending it
   * the contributions recorder's contributor and the hook event reporter's
   * reporter.
   */
  async runHook(
    model: Model,
    witness: Witness,
    policy: string,
    hook: string,
  ): Promise<void> {
    this.#called = `the hook "${hook}" of policy "${policy}"`;
    await hookCalled(model, witness, policy, hook, {
      contributor: this.#carryingOn.lend(
        this.contributions.contributor,
        "contributor",
      ),
      reporter: this.#carryingOn.lend<HookReporter>(
        this.hookEvents.reporter,
        "reporter",
      ),
    });
  }

  /**
   * Calls the input adapter of the workflow attached to `step` for the input
   * of `key`, with the read access of a data bag holding `values`, built
   * with test support, keeping what it returns.
   *
   * @throws ModelError when the adapter requests data from the workflow,
   * which an adapter called alone is not given.
   */
  callAdapter(
    model: Model,
    workflow: Built<Scenario>,
    called: {
      readonly adapter: string;
      readonly step: string;
      readonly key: string;
    },
    values: readonly (readonly [string, PlainValue])[],
  ): void {
    const script = model.adapter(called.adapter);
    const step = stepNamed(workflow, called.step);
    const bag = values.reduce(holding, new TestDataBag());
    const answers = script.requests.map((request) =>
      answerTo(request, bag, step),
    );
    this.#returned = workflow.adapt(step, called.key, ...answers);
  }
}

/** The name of the workflow's step `step`, as itinera gives it. */
function stepNamed(workflow: Built<Scenario>, step: string): StepName {
  const listed = workflow.instance().descriptor.listing().find(listing(step));
  if (listed === undefined) {
    throw new ModelError(`the workflow has no step "${step}"`);
  }
  return listed.step;
}

function listing(step: string): (listed: ListedStep) => boolean {
  return (listed) => listed.step === step;
}

/** What itinera would answer the adapter's request with, for an adapter called alone. */
function answerTo(
  request: AdapterRequest,
  bag: TestDataBag,
  step: StepName,
): unknown {
  switch (request.kind) {
    case "data bag":
      return bag.access;
    case "step name":
      return step;
    case "data from the workflow":
      throw new ModelError(
        "an input adapter called alone is given no data from the workflow",
      );
  }
}

function holding(
  bag: TestDataBag,
  [key, value]: readonly [string, PlainValue],
): TestDataBag {
  return bag.with<PlainValue>(key, value);
}
