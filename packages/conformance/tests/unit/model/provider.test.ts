import { describe, expect, it } from "vitest";
import { ModelError } from "../../../src/model/error.js";
import {
  implementationNamed,
  serviceTypeNamed,
} from "../../../src/model/provider.js";

describe("the names of the cases", () => {
  it.each([
    ["a service type", serviceTypeNamed, "printer"],
    ["an implementation of labeller", implementationNamed, "third labeller"],
  ])("refuses %s the cases never name", (_, named, name) => {
    expect(() => named(name)).toThrow(ModelError);
  });
});
