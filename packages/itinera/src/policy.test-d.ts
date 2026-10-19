import { describe, it } from "vitest";
import type {
  PolicyName,
  RetryCause,
  StepHook,
  WorkflowHook,
} from "./policy.js";

declare function naming(policy: PolicyName): void;
declare function hooking(hook: StepHook | WorkflowHook): void;
declare function retrying(cause: RetryCause): void;

describe("PolicyName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a policy name
    naming("fraud check");
  });
});

describe("StepHook and WorkflowHook", () => {
  it("are only their values", () => {
    hooking("on workflow success");
    // @ts-expect-error not a value of either set
    hooking("on step retried");
  });
});

describe("RetryCause", () => {
  it("is only one of its values", () => {
    retrying("abnormal termination");
    // @ts-expect-error retries exhausted is never a cause of a retry
    retrying("retries exhausted");
  });
});
