import { isDeepStrictEqual } from "node:util";
import { Given, Then, When } from "@cucumber/cucumber";
import { type Journey, ofJourney } from "../journeys.js";
import { ModelError } from "../model.js";
import type { ScenarioReporter } from "../recorders.js";
import { kindOf, numbered } from "../trace.js";
import { expectOfStream, holds } from "../unmet.js";
import type { World } from "../world.js";

Given<World>("step {string} is asynchronous", function (step: string) {
  this.model.step(step).asynchronous = true;
});

When<World>(
  "the same executor runs the workflow twice, with a new instance each time",
  async function () {
    await this.run(2);
  },
);

Then<World>("the two journeys have different journey IDs", function () {
  const [first, second] = two(this);
  holds(
    first.journeyId !== second.journeyId,
    "two journey IDs",
    `"${first.journeyId}" twice`,
  );
});

Then<World>(
  "the second journey's events are the first journey's events, apart from the journey ID and timestamps",
  function () {
    const [first, second] = two(this);
    const firsts = this.stream(first);
    const seconds = this.stream(second);
    expectOfStream(
      firsts.length > 0 &&
        isDeepStrictEqual(firsts.map(numbered), seconds.map(numbered)),
      `the second journey's events to be the first's, ${JSON.stringify(firsts.map(kindOf))}`,
      seconds,
    );
  },
);

/** The scenario's two journeys, in the order they ran. */
function two(world: World): readonly [Journey, Journey] {
  const [first, second, ...more] = world.journeys;
  if (first === undefined || second === undefined || more.length > 0) {
    throw new ModelError(
      `the workflow ran ${String(world.journeys.length)} journeys, not two`,
    );
  }
  return [first, second];
}

Then<World>(
  "each instance's reporter {string} received only its own journey's events",
  function (reporter: string) {
    if (!(this.model.workflow.reporters ?? []).includes(reporter)) {
      throw new ModelError(`the workflow lists no reporter "${reporter}"`);
    }
    const made = this.recorders.made(reporter);
    holds(
      this.journeys.length > 0 && made.length === this.journeys.length,
      `one "${reporter}" made with each of the journeys`,
      `${String(made.length)} made for ${String(this.journeys.length)} journeys`,
    );
    for (const [place, journey] of this.journeys.entries()) {
      const events = made[place]?.events ?? [];
      expectOfStream(
        events.length > 0 && events.every(ofJourney(journey.journeyId)),
        `"${reporter}" of journey "${journey.journeyId}" to receive its journey's events only`,
        events,
      );
    }
  },
);

Then<World>(
  "the reporter {string} was made with the journey ID {string}",
  function (reporter: string, journeyId: string) {
    const made = this.recorders.receivers(reporter).map(madeWith);
    holds(
      isDeepStrictEqual(new Set(made), new Set([journeyId])),
      `"${reporter}" made with the journey ID "${journeyId}"`,
      JSON.stringify(made),
    );
  },
);

function madeWith(reporter: ScenarioReporter): string | undefined {
  return reporter.madeWith;
}
