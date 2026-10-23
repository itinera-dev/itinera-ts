import { describe, expect, it } from "vitest";
import { requestsOf } from "../../../src/declaration.js";
import { Workflow } from "../../../src/workflow.js";
import {
  providerReporter,
  type ProviderReporter,
} from "../../../src/service/reporter.js";

describe("providerReporter", () => {
  it("records a request for a provider reporter", () => {
    class Orders extends Workflow {
      payments(@providerReporter() reporter: ProviderReporter): unknown {
        return reporter;
      }
    }
    expect(requestsOf(Orders, "payments")).toEqual([
      { kind: "providerReporter" },
    ]);
  });
});
