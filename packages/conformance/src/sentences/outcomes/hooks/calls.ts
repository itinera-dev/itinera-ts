/** The calls of a scenario's hook, and what each received for one of its requests. */
import { ModelError } from "../../../model.js";
import { type HookRequest, hookNamed } from "../../../model/policy.js";
import { type Called, receivedBy } from "../../../witness/hooks.js";
import type { World } from "../../../world.js";

/** A request of a hook, with what each call of the hook received for it, in order. */
interface Answered {
  readonly request: HookRequest;
  readonly answers: readonly unknown[];
}

/** The hook's request that `matches` finds, with what each call of the hook received for it. */
export function requestAt(
  world: World,
  hook: string,
  policy: string,
  matches: (request: HookRequest) => boolean,
): Answered {
  const { requests } = world.model.policies.hook(policy, hook);
  const at = requests.findIndex(matches);
  const request = requests[at];
  if (request === undefined) {
    throw new ModelError(`${hook} of "${policy}" never makes that request`);
  }
  const answers = callsOf(world, hook, policy)
    .map(receivedBy)
    .filter(isReceived)
    .map(answerAt(at));
  return { request, answers };
}

function isReceived(
  received: readonly unknown[] | undefined,
): received is readonly unknown[] {
  return received !== undefined;
}

/** Every call of the hook of the policy, in order. */
export function callsOf(
  world: World,
  hook: string,
  policy: string,
): readonly Called[] {
  const { kind } = world.model.policies.policy(policy);
  return world.witness.hooks.of(policy, hookNamed(kind, hook));
}

function answerAt(at: number): (received: readonly unknown[]) => unknown {
  return (received) => received[at];
}
