import { Given } from "@cucumber/cucumber";
import { answerOf, scripted, type CaseType } from "../model.js";
import type { World } from "../world.js";

Given<World>(
  "the workflow declares the input adapter {string} for the steps {names}",
  function (adapter: string, steps: string[]) {
    this.model.adapters.declare(adapter, steps);
  },
);

/** Every "returns … for" sentence, since each begins as the others do. */
Given<World>(
  /^the input adapter "([^"]*)" returns (.+) for "([^"]*)"$/,
  function (adapter: string, written: string, key: string) {
    this.model.adapters
      .adapter(adapter)
      .answers.push({ key, answer: answerOf(written) });
  },
);

Given<World>(
  "the input adapter {string} fails with {string} for {string}",
  function (adapter: string, message: string, key: string) {
    this.model.adapters
      .adapter(adapter)
      .answers.push({ key, answer: { kind: "fails", message } });
  },
);

Given<World>(
  "the input adapter {string} requests data from the workflow {string} of type {type}",
  function (adapter: string, key: string, type: CaseType) {
    this.model.adapters
      .adapter(adapter)
      .requests.push({ kind: "data from the workflow", key, type });
  },
);

Given<World>(
  "the input adapter {string} requests the step name and returns it for {string}",
  function (adapter: string, key: string) {
    const script = this.model.adapters.adapter(adapter);
    script.requests.push({ kind: "step name" });
    script.answers.push({ key, answer: { kind: "returns the step name" } });
  },
);

Given<World>(
  "the input adapter {string} requests the data bag",
  function (adapter: string) {
    this.model.adapters.adapter(adapter).requests.push({ kind: "data bag" });
  },
);

Given<World>(
  /^the input adapter "([^"]*)" writes "([^"]*)" = (.+) through its data bag access$/,
  function (adapter: string, key: string, value: string) {
    this.model.adapters.adapter(adapter).writes.push([key, scripted(value)]);
  },
);

Given<World>(
  "the input adapter {string} keeps its data bag access when called for step {string}, and returns {string} of type {type}, read through that kept access, for {string} when called for step {string}",
  function (
    adapter: string,
    kept: string,
    key: string,
    type: CaseType,
    input: string,
    step: string,
  ) {
    const script = this.model.adapters.adapter(adapter);
    script.keepsAccessFor = kept;
    script.answers.push({
      key: input,
      step,
      answer: {
        kind: "returns what it reads",
        key,
        type,
        through: "the kept access",
      },
    });
  },
);

/** Both "returns … when step … requests" sentences, a value or nothing. */
Given<World>(
  /^the input adapter "([^"]*)" returns (.+) when step "([^"]*)" requests "([^"]*)"$/,
  function (adapter: string, written: string, step: string, key: string) {
    this.model.adapters
      .adapter(adapter)
      .answers.push({ key, step, answer: answerOf(written) });
  },
);

Given<World>(
  "the input adapter {string} fails with {string} when step {string} requests {string}",
  function (adapter: string, message: string, step: string, key: string) {
    this.model.adapters
      .adapter(adapter)
      .answers.push({ key, step, answer: { kind: "fails", message } });
  },
);

Given<World>(
  "the workflow binds the input adapter {string} to the step {string}",
  function (adapter: string, step: string) {
    this.model.adapters.bind(adapter, [step]);
  },
);

Given<World>(
  "the workflow binds the input adapter {string} to the steps {names}",
  function (adapter: string, steps: string[]) {
    this.model.adapters.bind(adapter, steps);
  },
);
