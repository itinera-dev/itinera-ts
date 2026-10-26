import type { StepPolicyClass } from "./step-policy.js";
import type { WorkflowPolicyClass } from "./workflow-policy.js";

/**
 * The roles every policy of the list `P` requests, joined with `&`: what a
 * workflow that the policies are attached to must implement. A list that is
 * not written in place, whose length the compiler cannot see, gives `never`,
 * so that no workflow compiles with it, since its roles cannot be known. A
 * list that may be one of several, such as `flag ? [Notify] : []`, gives the
 * roles of every one of them.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export type RolesOf<P extends readonly unknown[]> = number extends P["length"]
  ? never
  : [
        P extends readonly [infer First, ...infer Rest]
          ? (roles: RolesOfOne<First> & RolesOf<Rest>) => void
          : (roles: unknown) => void,
      ] extends [(roles: infer R) => void]
    ? R
    : never;

/**
 * The roles the policy class `C` requests, as its base class's type argument
 * names them. A class that may be one of several, such as
 * `flag ? Notify : Quiet`, gives the roles of every one of them.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export type RolesOfOne<C> = [
  C extends StepPolicyClass<infer R>
    ? (roles: R) => void
    : C extends WorkflowPolicyClass<infer R>
      ? (roles: R) => void
      : (roles: unknown) => void,
] extends [(roles: infer R) => void]
  ? R
  : never;
