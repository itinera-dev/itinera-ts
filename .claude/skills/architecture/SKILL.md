---
name: architecture
description: How Claude finds which parts of docs/architecture.md in itinera-ts a change makes untrue, and checks the whole document against the code. Use when reviewing a change, when a stage or tier lands, and when asked whether the architecture diagrams are still true.
---

# Keeping the architecture document true

[AGENTS.md](../../../AGENTS.md) holds the rule, in the bullet on `docs/architecture.md`: a change that makes the document untrue updates it in the same pull request. This skill says how to tell which parts a change touches, and how to check them. It adds no rule of its own.

## What each section describes

The document starts in stage 3, which adds its first sections, and each later stage of tier 1 adds the sections of what it builds, or corrects those it changes. Each section ends with a "Where it lives" line.

This skill keeps a table of the sections, with three columns: the section, the code it describes, which repeats its "Where it lives" line, and what else makes the section untrue when it changes, such as a subpath, a decorator, a request or an event being added, removed or renamed. The pull request that adds a section to the document adds its row here, and one that changes a "Where it lives" line changes the row.

Paths under `engine/`, `step/` and the like are in `packages/itinera/src/`.

| Section | Code it describes | Also untrue when |
|---|---|---|
| The packages | `packages/`, and each module in `packages/itinera/src/` | a package, a subpath or a module is added, removed or renamed, or a module's contents move |
| What a workflow is made of | `workflow/decorators.ts`, `workflow/id-generator.ts`, `workflow/builder.ts`, `workflow/descriptor.ts`, `workflow/registry.ts`, `step/descriptor.ts`, `instance.ts` | a decorator, a builder method, or a member of `WorkflowDescriptor`, `StepDescriptor` or `WorkflowInstance` is added, removed or renamed |
| How requests are declared | `declaration.ts`, `declaration/request.ts`, `declaration/parameter.ts`, `declaration/metadata.ts`, `value/token.ts`, `step/request.ts`, `step/declared.ts`, `journey/contributor.ts`, `journey/request.ts`, `service/request.ts`, `service/reporter.ts`, `workflow/request.ts`, `workflow/adapter.ts`, `service/provider.ts`, `step/rescue.ts`, `policy/request.ts`, `policy/reporter.ts` | a request decorator, a type token, a `Request` kind or a type read from the metadata is added, removed or renamed |
| How policies are declared | `policy/hooks.ts`, `policy/declared.ts`, `policy/step-policy.ts`, `policy/workflow-policy.ts`, `policy/lifecycle.ts`, `policy/roles.ts`, `workflow/decorators.ts`, `workflow/registry.ts`, `step/descriptor.ts` | a hook, a check made when a policy is declared, what a hook returns, or how policies are attached or their roles checked, changes |
| How rescue steps, input adapters and providers are declared | `step/rescue.ts`, `workflow/adapter.ts`, `service/provider.ts`, `service/reporter.ts`, `workflow/registry.ts`, `workflow/decorators.ts`, `workflow.ts`, `step/descriptor.ts`, `declaration.ts` | a decorator of rescue steps, adapters or providers, what they may request, what they return, or how they are recorded or attached, changes |
| From declaration to result | `executor.ts`, `executor/refusal.ts`, `engine.ts`, `engine/start.ts` | a refusal is added or removed, or what happens before a journey changes order |
| How a journey runs | `engine/scan.ts`, `engine/decision.ts`, `engine.ts`, `step/outcome.ts`, `journey/result.ts` | an outcome, a decision, an event of the flow, an abort reason or a status is added, or the scan changes |
| Events and reporters | `engine/journey.ts`, `engine/emitter.ts`, `engine/guard.ts`, `engine/frozen.ts`, `report/default-dispatcher.ts` | what every event carries, or the rules on a reporter or dispatcher that fails, change |

## Checking a change

1. List the files the diff changes, and the public names, events, aborts, failures, hooks, requests, decorators, subpaths and modules it adds, removes or renames.
2. For each, find the sections of the table it touches.
3. For each section found, read its diagram, its numbered list, its tables and its "Where it lives" line against the code after the change. Each statement is either still true, or untrue, with the `file:line` that contradicts it.
4. Check that every path and name in a "Where it lives" line still exists.
5. For each untrue statement, check that the diff corrects it. A missing correction is a finding, with the text to write.
6. A change that touches no section needs nothing, and the review says so in one line.

## Checking the whole document

When a stage or a tier lands, or when asked, do step 3 and 4 for every section, against the current `main`. A stage of tier 1 adds the sections of what it builds. A later tier gets its own section, `## Tier N`, holding only what that tier adds or changes, with the same kinds of diagram.

## Writing a correction

1. Follow the "Writing" section of AGENTS.md: every diagram is Mermaid, with `accTitle` and `accDescr`, and the numbered list after it says everything the diagram shows. Change the diagram, its `accDescr` and its list together.
2. Use the specification's vocabulary, and the TypeScript names of the code.
3. Before pushing, render every changed diagram to be sure it parses, for example with `npx -y @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.svg`. In a cloud session, point it at the pre-installed Chromium with a Puppeteer configuration file holding `{"executablePath": "/opt/pw-browsers/chromium", "args": ["--no-sandbox"]}`, passed with `-p`.
