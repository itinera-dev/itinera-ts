import { Given } from "@cucumber/cucumber";
import type { World } from "../world.js";

Given<World>("the workflow has no ID generator", function () {
  this.model.generateIdsWith({ kind: "default" });
});

Given<World>(
  "the workflow's ID generator returns {string}",
  function (id: string) {
    this.model.generateIdsWith({ kind: "returns", id });
  },
);
