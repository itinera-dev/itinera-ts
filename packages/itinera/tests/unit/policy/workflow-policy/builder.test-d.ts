import { describe, it } from "vitest";
import { Close, type Messages } from "../../../fixtures/policy.js";
import { role } from "../../../../src/policy/request.js";
import { WorkflowPolicy } from "../../../../src/policy/workflow-policy.js";

describe("a workflow policy's builder", () => {
  it("compiles with methods of the class", () => {
    Close.builder().onWorkflowSuccess("closed").onWorkflowFailure("failed");
  });

  it("compiles with a role the policy requests", () => {
    class Notify extends WorkflowPolicy<Messages> {
      paid(messages: Messages): void {
        messages.tell("paid");
      }
    }
    Notify.builder().onWorkflowSuccess("paid", role<Messages>());
  });

  it("does not compile with a method that returns something", () => {
    class Counting extends WorkflowPolicy {
      counted(): number {
        return 1;
      }
    }
    // @ts-expect-error a workflow hook returns nothing
    Counting.builder().onWorkflowSuccess("counted");
  });

  it("does not compile with a role the policy does not request", () => {
    class Notify extends WorkflowPolicy {
      paid(messages: Messages): void {
        messages.tell("paid");
      }
    }
    // @ts-expect-error Notify requests no role
    Notify.builder().onWorkflowSuccess("paid", role<Messages>());
  });
});
