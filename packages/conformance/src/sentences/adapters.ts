import { Given } from "@cucumber/cucumber";
import { answerOf, scripted, type CaseType } from "../model.js";
import type { World } from "../world.js";

Given<World>(
  "the workflow declares the input adapter {string} for the steps {names}",
  function (adapter: string, steps: string[]) {
    this.model.declareAdapter(adapter, steps);
  },
);

/** Every "returns … for" sentence, since each begins as the others do. */
Given<World>(
  /^the input adapter "([^"]*)" returns (.+) for "([^"]*)"$/,
  function (adapter: string, written: string, key: string) {
    this.model
      .adapter(adapter)
      .answers.push({ key, answer: answerOf(written) });
  },
);

Given<World>(
  "the input adapter {string} fails with {string} for {string}",
  function (adapter: string, message: string, key: string) {
    this.model
      .adapter(adapter)
      .answers.push({ key, answer: { kind: "fails", message } });
  },
);

Given<World>(
  "the input adapter {string} requests data from the workflow {string} of type {type}",
  function (adapter: string, key: string, type: CaseType) {
    this.model
      .adapter(adapter)
      .requests.push({ kind: "data from the workflow", key, type });
  },
);

Given<World>(
  "the input adapter {string} requests the step name and returns it for {string}",
  function (adapter: string, key: string) {
    const script = this.model.adapter(adapter);
    script.requests.push({ kind: "step name" });
    script.answers.push({ key, answer: { kind: "returns the step name" } });
  },
);

Given<World>(
  "the input adapter {string} requests the data bag",
  function (adapter: string) {
    this.model.adapter(adapter).requests.push({ kind: "data bag" });
  },
);

Given<World>(
  /^the input adapter "([^"]*)" writes "([^"]*)" = (.+) through its data bag access$/,
  function (adapter: string, key: string, value: string) {
    this.model.adapter(adapter).writes.push([key, scripted(value)]);
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
    const script = this.model.adapter(adapter);
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
