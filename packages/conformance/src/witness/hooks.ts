import type {
  HookCall,
  StepPolicyMock,
  WorkflowPolicyMock,
} from "itinera/unstable";
import type { Hook } from "../model/policy.js";

/** One call of a hook of a scripted policy, in the order calls were made. */
export interface Called {
  readonly policy: string;
  readonly hook: Hook;
  /** The policy mock it was called on. */
  readonly mock: StepPolicyMock | WorkflowPolicyMock;
  /** Where the mock keeps the call, among its own calls. */
  readonly index: number;
}

/** How many requests come before the scripted ones: the contributor and the hook reporter. */
const lent = 2;

/** Every call of every hook of the scenario's policies, in the order made. */
export class HookWitness {
  readonly #called: Called[] = [];

  /** Keeps the call of the hook on the mock, before the mock itself keeps it. */
  call(
    policy: string,
    hook: Hook,
    mock: StepPolicyMock | WorkflowPolicyMock,
  ): void {
    this.#called.push({ policy, hook, mock, index: mock.calls.length });
  }

  /** Every call made, in order. */
  get calls(): readonly Called[] {
    return [...this.#called];
  }

  /** The calls of the hook of the policy, in order. */
  of(policy: string, hook: Hook): readonly Called[] {
    return this.#called.filter((called) => isOf(called, policy, hook));
  }
}

/**
 * What the call's scripted requests were answered with, in the order
 * written, once the mock kept the call; none when the hook failed before
 * its mock was reached.
 */
export function receivedBy(called: Called): readonly unknown[] | undefined {
  const call: HookCall | undefined = called.mock.calls[called.index];
  return call?.received.slice(lent);
}

function isOf(called: Called, policy: string, hook: Hook): boolean {
  return called.policy === policy && called.hook === hook;
}
