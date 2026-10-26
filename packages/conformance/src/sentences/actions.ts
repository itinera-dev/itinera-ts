import { When } from "@cucumber/cucumber";
import type { World } from "../world.js";

When<World>("the workflow is admitted", function () {
  this.admit();
});

When<World>("the workflow runs", async function () {
  await this.run(1);
});

When<World>("the workflow is listed", function () {
  this.list();
});
