import {
  DataBag,
  None,
  type Option,
  type PlainValue,
  Some,
} from "itinera/unstable";
import { given } from "./given.js";
import {
  adapterOf,
  answerFor,
  type AdapterRequest,
  type AdapterScript,
  isForTheDataBag,
  isForTheStepName,
} from "./model/adapter.js";
import type { Scripted, ValueType } from "./model/value.js";
import { tokenOf } from "./tokens.js";

/**
 * The scripted input adapters of a scenario, played as itinera calls them,
 * with the data bag access each kept from an earlier call.
 */
export class Adapters {
  readonly #scripts: readonly AdapterScript[];
  readonly #kept = new Map<string, DataBag>();

  constructor(scripts: readonly AdapterScript[]) {
    this.#scripts = scripts;
  }

  /**
   * What the adapter attached to `step` supplies when it is asked for the
   * input of `key`, given what its own requests were answered with, in the
   * order its script declares them: a value, as the scenario gives it, or
   * nothing, so the input is read from the data bag.
   *
   * @throws Error when its script says it fails for the input, or when
   * itinera did not answer a request it reads.
   */
  reply(
    step: string,
    key: string,
    answers: readonly unknown[],
  ): Option<Scripted> {
    const script = adapterOf(this.#scripts, step);
    const access = accessIn(script.requests, answers);
    for (const [written, value] of script.writes) {
      writeThrough(heldBy(access), written, value);
    }
    if (script.keepsAccessFor === step && access !== undefined) {
      this.#kept.set(script.name, access);
    }
    const answer = answerFor(script, step, key);
    switch (answer.kind) {
      case "returns":
        return Some(answer.value);
      case "returns nothing":
        return None;
      case "fails":
        throw new Error(answer.message);
      case "returns the step name":
        return Some(asScripted(stepNameIn(script.requests, answers)));
      case "returns what it reads":
        return readThrough(
          answer.through === "its access"
            ? access
            : this.#kept.get(script.name),
          answer.key,
          answer.type,
        );
    }
  }
}

/** The data bag access among the answers, when the adapter requests one. */
function accessIn(
  requests: readonly AdapterRequest[],
  answers: readonly unknown[],
): DataBag | undefined {
  const answer = answers[requests.findIndex(isForTheDataBag)];
  return answer instanceof DataBag ? answer : undefined;
}

/** The step name among the answers, which the adapter requests. */
function stepNameIn(
  requests: readonly AdapterRequest[],
  answers: readonly unknown[],
): string {
  const answer = answers[requests.findIndex(isForTheStepName)];
  if (typeof answer !== "string") {
    throw new Error("itinera gave the input adapter no step name");
  }
  return answer;
}

/**
 * The value of `key` read through the access when it holds one of the type,
 * or else nothing.
 */
function readThrough(
  access: DataBag | undefined,
  key: string,
  type: ValueType,
): Option<Scripted> {
  return heldBy(access).read(key, tokenOf(type)).option().map(asScripted);
}

/** The access, which the script makes sure the adapter requests or keeps. */
function heldBy(access: DataBag | undefined): DataBag {
  if (access === undefined) {
    throw new Error("itinera gave the input adapter no data bag access");
  }
  return access;
}

/**
 * Writes through the access as far as the language allows: a data bag has
 * no method that writes, so this sets a property of the object it is.
 */
function writeThrough(access: DataBag, key: string, value: Scripted): void {
  Reflect.set(access, key, given(value));
}

function asScripted(value: PlainValue): Scripted {
  return { kind: "value", value };
}
