/**
 * The sentences that define a service provider before the workflow, and
 * bind it in the workflow after it.
 */
import { Given } from "@cucumber/cucumber";
import type { ServiceTypeName } from "../../model/provider.js";
import type { World } from "../../world.js";

Given<World>(
  "the service provider {string} makes a {serviceType} for {string}, once per journey",
  function (provider: string, type: ServiceTypeName, key: string) {
    this.model.providers.define(provider, { key, type }, "journey");
  },
);

Given<World>(
  "the service provider {string} makes a {serviceType} for {string}, for each attempt",
  function (provider: string, type: ServiceTypeName, key: string) {
    this.model.providers.define(provider, { key, type }, "attempt");
  },
);

Given<World>(
  "the workflow binds the service provider {string}",
  function (provider: string) {
    this.model.providers.bind(provider);
  },
);

Given<World>(
  "the workflow binds the service provider {string} to the step {string}",
  function (provider: string, step: string) {
    this.model.providers.bind(provider, [step]);
  },
);

Given<World>(
  "the workflow binds the service provider {string} to the steps {names}",
  function (provider: string, steps: string[]) {
    this.model.providers.bind(provider, steps);
  },
);
