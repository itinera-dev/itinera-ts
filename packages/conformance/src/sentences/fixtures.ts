import { Given } from "@cucumber/cucumber";
import type { Fixture } from "../fixture.js";
import type { World } from "../world.js";

Given<World>("the {fixture} workflow", function (fixture: Fixture) {
  this.nameFixture(fixture);
});
