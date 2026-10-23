import { Given } from "@cucumber/cucumber";
import type { World } from "../world.js";

Given<World>("step {string} is asynchronous", function (step: string) {
  this.model.step(step).asynchronous = true;
});
