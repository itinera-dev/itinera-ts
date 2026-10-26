import { Given } from "@cucumber/cucumber";
import {
  emit,
  type Level,
  nonValue,
  scripted,
  type ValueType,
} from "../model.js";
import {
  type Implementation,
  type ProviderRequest,
  type ServiceTypeName,
} from "../model/provider.js";
import type { World } from "../world.js";

Given<World>(
  "step {string} requests the service {string} of type {serviceType}",
  function (step: string, key: string, type: ServiceTypeName) {
    this.model.step(step).services.push({ key, type });
  },
);

Given<World>(
  "the workflow declares the service provider {string} for {string} of type {serviceType}, once per journey",
  function (provider: string, key: string, type: ServiceTypeName) {
    this.model.providers.declare(provider, { key, type }, "journey");
  },
);

Given<World>(
  "the workflow declares the service provider {string} for {string} of type {serviceType}, for each attempt",
  function (provider: string, key: string, type: ServiceTypeName) {
    this.model.providers.declare(provider, { key, type }, "attempt");
  },
);

Given<World>(
  "the service provider {string} serves only the steps {names}",
  function (provider: string, steps: string[]) {
    this.model.providers.attach(provider, steps);
  },
);

/** The three sentences of a provider requesting what names the attempt or the journey. */
Given<World>(
  /^the service provider "([^"]*)" requests the (step name|attempt number|journey ID)$/,
  function (
    provider: string,
    kind: "step name" | "attempt number" | "journey ID",
  ) {
    requests(this, provider, { kind });
  },
);

Given<World>(
  "the service provider {string} requests data from the workflow {string} of type {type}",
  function (provider: string, key: string, type: ValueType) {
    requests(this, provider, {
      kind: "data from the workflow",
      key,
      type,
      optional: false,
    });
  },
);

Given<World>(
  "the service provider {string} requests optional data from the workflow {string} of type {type}",
  function (provider: string, key: string, type: ValueType) {
    requests(this, provider, {
      kind: "data from the workflow",
      key,
      type,
      optional: true,
    });
  },
);

function requests(
  world: World,
  provider: string,
  request: ProviderRequest,
): void {
  world.model.providers.provider(provider).requests.push(request);
}

Given<World>(
  "the service provider {string} labels each instance with the value it received for {string}",
  function (provider: string, key: string) {
    this.model.providers.provider(provider).labelsWith = key;
  },
);

Given<World>(
  "the service provider {string} fails with {string}",
  function (provider: string, message: string) {
    this.model.providers.fails(provider, { message });
  },
);

Given<World>(
  "the service provider {string} fails with {string} when it receives {string} for {string}",
  function (provider: string, message: string, value: string, key: string) {
    this.model.providers.fails(provider, { message, when: { key, value } });
  },
);

/** The three "emits" sentences of a provider, with data or without. */
Given<World>(
  /^the service provider "([^"]*)" emits journey_(info|warning|error) "([^"]*)"(?: with data (.+))?$/,
  function (
    provider: string,
    level: Level,
    message: string,
    data: string | null,
  ) {
    this.model.providers
      .provider(provider)
      .actions.push(emit(level, message, data));
  },
);

Given<World>(
  /^the service provider "([^"]*)" sets the global metadata "([^"]*)" to (.+)$/,
  function (provider: string, key: string, value: string) {
    this.model.providers.provider(provider).actions.push({
      kind: "set global metadata",
      key,
      value: scripted(value),
    });
  },
);

Given<World>(
  "the service provider {string} makes instances of {implementation}",
  function (provider: string, implementation: Implementation) {
    this.model.providers.provider(provider).implementation = implementation;
  },
);

Given<World>(
  /^the service provider "([^"]*)" supplies the data (.+) with each instance$/,
  function (provider: string, data: string) {
    this.model.providers.provider(provider).data = scripted(data);
  },
);

Given<World>(
  "the service provider {string} supplies data that is not a value with each instance",
  function (provider: string) {
    this.model.providers.provider(provider).data = nonValue;
  },
);

Given<World>(
  "the service provider {string} is asynchronous",
  function (provider: string) {
    this.model.providers.provider(provider).asynchronous = true;
  },
);

Given<World>(
  "the services the provider {string} makes fail with {string} when used",
  function (provider: string, message: string) {
    this.model.providers.provider(provider).servicesFailWith = message;
  },
);
