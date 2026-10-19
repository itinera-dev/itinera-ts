# 0098: Input adapters and providers of a rescue step

Tech spec for [proposal 0098](https://github.com/itinera-dev/spec/blob/main/proposals/0098-rescue-step-adapters-and-providers.md), implemented in [#32](https://github.com/itinera-dev/itinera-ts/issues/32). The [tier 1 plan](../tier-1-plan.md) holds what crosses proposals, [0003](0003-rescue-steps.md) the rescue steps, [0060](0060-input-adapters-attached-to-steps.md) the input adapters and [0095](0095-services-provided-to-steps.md) the providers.

Status: in progress. Stage 4 has let `@inputAdapter` and `@provider` name `<step name>_rescue` in their `steps`. Its next layer checks those names against the workflow's rescue steps, as the violations `input adapter for unknown step` and `service provider for unknown step`, and stage 9 attaches adapters and providers to rescue steps and lists the proposal.

## API

- **`<step name>_rescue`** in the `steps` of `@inputAdapter` or `@provider` names the rescue step of that step. Both record it as written; nothing is exported for it.

## Dependencies

None of its own.

## Tests

- `src/workflow/adapter.test.ts` and `src/service/provider.test.ts`: a rescue step's name recorded among the steps.

## Done when

Every scenario tagged `@proposal-0098` passes, and 98 is listed in `conformance.json`. Planned for stage 9.
