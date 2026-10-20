import { Some } from "itinera/option";
import type { Provided, ProviderReporter } from "itinera/service";
import type { PlainValue } from "itinera/value";
import { given } from "./given.js";
import { listedUnder } from "./listed.js";
import { ModelError } from "./model/error.js";
import {
  dataUnder,
  type ProviderAction,
  type ProviderFailure,
  type Providers,
  type ProviderScript,
} from "./model/provider.js";
import {
  answering,
  type Labeller,
  labellerClassOf,
  type Meter,
  ScriptedMeter,
} from "./services.js";

/** What makes what a provider returns: the workflow's `this.provide`. */
export type Provide = (
  instance: Labeller | Meter,
  data?: PlainValue,
) => Provided<unknown>;

/**
 * The scripted service providers of a scenario, played as itinera calls
 * them, with every call each received and how many instances each made.
 */
export class Played {
  readonly #scripts: Providers;
  readonly #calls = new Map<string, (readonly unknown[])[]>();
  readonly #made = new Map<string, number>();

  constructor(scripts: Providers) {
    this.#scripts = scripts;
  }

  /**
   * What the provider named returns when it is called with `answers`: what
   * its own requests were answered with, in the order its script declares
   * them, then its provider reporter. A provider that emits, sets global
   * metadata or runs asynchronously returns a promise.
   *
   * @throws Error when its script says it fails on this call.
   */
  play(
    name: string,
    answers: readonly unknown[],
    provide: Provide,
  ): Provided<unknown> | Promise<Provided<unknown>> {
    const script = this.#scripts.provider(name);
    listedUnder(this.#calls, name).push(answers);
    return script.asynchronous || script.actions.length > 0
      ? this.#acted(script, answers, provide)
      : this.#provided(script, answers, provide);
  }

  /** What each call of the provider named received, in order. */
  callsTo(name: string): readonly (readonly unknown[])[] {
    return [...listedUnder(this.#calls, name)];
  }

  async #acted(
    script: ProviderScript,
    answers: readonly unknown[],
    provide: Provide,
  ): Promise<Provided<unknown>> {
    const reporter = answers.at(-1) as ProviderReporter;
    for (const action of script.actions) {
      await acted(reporter, action);
    }
    return this.#provided(script, answers, provide);
  }

  #provided(
    script: ProviderScript,
    answers: readonly unknown[],
    provide: Provide,
  ): Provided<unknown> {
    const { failure } = script;
    if (failure !== undefined && failsOn(script, failure, answers)) {
      throw new Error(failure.message);
    }
    const made = (this.#made.get(script.name) ?? 0) + 1;
    this.#made.set(script.name, made);
    const label =
      script.labelsWith === undefined
        ? `${script.name} ${String(made)}`
        : String(receivedFor(script, answers, script.labelsWith));
    const instance = instanceOf(script, label);
    return script.data === undefined
      ? provide(instance)
      : provide(instance, given(script.data));
  }
}

async function acted(
  reporter: ProviderReporter,
  action: ProviderAction,
): Promise<void> {
  switch (action.kind) {
    case "emit":
      await (action.data === undefined
        ? reporter[action.level](action.message)
        : reporter[action.level]<PlainValue>(
            action.message,
            given(action.data),
          ));
      return;
    case "set global metadata":
      await reporter.setGlobalMetadata(action.key, given(action.value));
  }
}

/** Whether the provider fails on a call given `answers`, as its failure says. */
function failsOn(
  script: ProviderScript,
  { when }: ProviderFailure,
  answers: readonly unknown[],
): boolean {
  return (
    when === undefined || receivedFor(script, answers, when.key) === when.value
  );
}

/**
 * What the provider received for its request of data from the workflow
 * under `key`, which itinera gives inside an `Option` when it is optional,
 * or `undefined` when it received nothing.
 *
 * @throws ModelError when the provider requests no data under `key`.
 */
function receivedFor(
  script: ProviderScript,
  answers: readonly unknown[],
  key: string,
): unknown {
  const at = script.requests.findIndex(dataUnder(key));
  if (at === -1) {
    throw new ModelError(
      `the service provider "${script.name}" requests no data under "${key}"`,
    );
  }
  const answer = answers[at];
  return answer instanceof Some ? answer.value : answer;
}

/** A new instance the provider makes, of its service type and implementation. */
function instanceOf(script: ProviderScript, label: string): Labeller | Meter {
  const answers = answering(script.servicesFailWith);
  if (script.service.type === "meter") {
    return new ScriptedMeter(answers);
  }
  const Labelling = labellerClassOf(script.implementation);
  return new Labelling(label, answers);
}
