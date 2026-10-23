import { Given } from "@cucumber/cucumber";
import { emit, eventKind, type Level } from "../model.js";
import type { World } from "../world.js";

Given<World>(
  "the workflow lists the reporters {names}",
  function (reporters: string[]) {
    this.model.listReporters(reporters);
  },
);

Given<World>("the executor uses its default dispatcher", function () {
  this.model.dispatchWith({ kind: "default" });
});

Given<World>(
  "the executor is given a dispatcher holding the reporter {string}",
  function (reporter: string) {
    this.model.dispatchWith({
      kind: "holding",
      reporter,
      holding: { kind: "adds reporters" },
    });
  },
);

Given<World>(
  "the executor is given a dispatcher factory that fails",
  function () {
    this.model.dispatchWith({ kind: "failing factory" });
  },
);

Given<World>(
  "the executor is given a dispatcher holding the reporter {string} that ignores added reporters",
  function (reporter: string) {
    this.model.dispatchWith({
      kind: "holding",
      reporter,
      holding: { kind: "ignores added reporters" },
    });
  },
);

Given<World>(
  "the executor is given a dispatcher holding the reporter {string} that throws when a reporter is added",
  function (reporter: string) {
    this.model.dispatchWith({
      kind: "holding",
      reporter,
      holding: { kind: "fails when adding" },
    });
  },
);

Given<World>(
  "the executor is given a dispatcher holding the reporter {string} that throws when dispatching {string}",
  function (reporter: string, event: string) {
    this.model.dispatchWith({
      kind: "holding",
      reporter,
      holding: { kind: "fails dispatching", event: eventKind(event) },
    });
  },
);

Given<World>("the reporter {string} throws", function (reporter: string) {
  this.model.fails(reporter, { kind: "first event" });
});

Given<World>(
  "the reporter {string} throws on {string}",
  function (reporter: string, event: string) {
    this.model.fails(reporter, { kind: "on event", event: eventKind(event) });
  },
);

Given<World>(
  "the reporter {string} fails with {string} on {string}",
  function (reporter: string, message: string, event: string) {
    this.model.fails(reporter, {
      kind: "on event",
      event: eventKind(event),
      message,
    });
  },
);

/** The three "emits" sentences of a step, since each begins as the next does. */
Given<World>(
  /^step "([^"]*)" emits step_(info|warning|error) "([^"]*)"(?: with data (.+))?$/,
  function (step: string, level: Level, message: string, data: string | null) {
    this.model.step(step).actions.push(emit(level, message, data));
  },
);
