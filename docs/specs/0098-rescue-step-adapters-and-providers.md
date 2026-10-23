# 0098: Input adapters and providers of a rescue step

Tech spec for [proposal 0098](https://github.com/itinera-dev/spec/blob/main/proposals/0098-rescue-step-adapters-and-providers.md), implemented in [#32](https://github.com/itinera-dev/itinera-ts/issues/32). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0003](0003-rescue-steps.md) the rescue steps, [0060](0060-input-adapters-attached-to-steps.md) the input adapters and [0095](0095-services-provided-to-steps.md) the providers.

Status: in progress. Stage 4 has let `@inputAdapter` and `@provider` name `<step name>_rescue` in their `steps`. Its next layer checks those names against the workflow's rescue steps, as the violations `input adapter for unknown step` and `service provider for unknown step`, and stage 9 attaches adapters and providers to rescue steps and lists the proposal.

Stage 9 needs nothing of its own for them: the engine builds a rescue step under its own name, so `adapting` and `serving` find the adapter and the providers attached to `<step name>_rescue`, and never those attached only to the step it rescues, and the adapter is told that name when it requests the step's name. A provider of journey scope attached to a step and its rescue step lends both the instance it made once.

## API

- **`<step name>_rescue`** in the `steps` of `@inputAdapter` or `@provider` names the rescue step of that step. Both record it as written; nothing is exported for it.

## Dependencies

None of its own.

## Tests

- `tests/unit/workflow/adapter.test.ts` and `tests/unit/service/provider.test.ts`: a rescue step's name recorded among the steps.
- `tests/unit/engine/build.test.ts`: an adapter attached to a step and its rescue step asked under each one's own name, and one attached only to the step never asked for the rescue step's inputs.
- `tests/unit/engine/services.test.ts`: a provider attached to the rescue step serving it instead of the one attached to no step, and a provider of journey scope attached to a step and its rescue step lending both one instance.

## Done when

Every scenario tagged `@proposal-0098` passes, and 98 is listed in `conformance.json`. Planned for stage 9.
