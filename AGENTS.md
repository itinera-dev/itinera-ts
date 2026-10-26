# Agents' manual

How to work in itinera-ts, the TypeScript implementation of [Itinera](https://github.com/itinera-dev/spec). This file is self-contained; read it before changing anything.

## Where behaviour comes from

- Behaviour comes only from the specification in [itinera-dev/spec](https://github.com/itinera-dev/spec), and the conformance cases in [itinera-dev/conformance](https://github.com/itinera-dev/conformance) check it.
- If the specification has a gap or a contradiction, stop and tell the maintainer. Never decide it in TypeScript.
- How TypeScript implements tier 1 is decided in [docs/tier-1-plan.md](docs/tier-1-plan.md). What concerns a single proposal goes in its tech spec, `docs/specs/NNNN-short-name.md`. Where the plan and the specification disagree, the specification is right and the plan is corrected.
- [docs/architecture.md](docs/architecture.md) draws how the implementation is put together and how it runs a journey, and each later stage adds what it builds. A change that makes any of its diagrams, lists, tables or "Where it lives" lines untrue updates it in the same pull request, and a later tier adds its own section once its stages land. Where the document and the code disagree, the document is corrected.

## Stages

The plan is implemented in stages, tracked in [#1](https://github.com/itinera-dev/itinera-ts/issues/1):

0. Bootstrap: the repository, the npm workspace, `tsconfig` in strict mode, lint, format, Vitest, CI, the commit convention and git-cliff, the README, the licences, this manual and `conformance.json`.
1. Values and events: the value check and copy, `Option`, `Some` and `None`, `Event` and what it carries, reporters, dispatchers and their factories, `DefaultDispatcher`, global metadata on dispatchers.
2. Runner skeleton: cucumber-js, the environment variables, the scenario model, the recording dispatcher factory and test support's recording reporter, from `itinera/unstable`, the Cucumber JSON report.
3. Minimal executor: the base classes `Workflow` and `Step`, the registry and the descriptor and instance interfaces, `@step`, `@workflow`, `@withStep` and `@idGenerator`, the metadata check; the builder with `.name(...)`, `constructWith` and `build()`, the static `build()` and the step descriptor's builder, for what this stage needs; test support's step mock and its `Ending`, from `itinera/unstable`, from which the runner builds its workflows with the builder; the engine and `LocalExecutor`, a workflow of one step that succeeds, the instance and journey IDs, reporters, the result and refusals.
4. Declarations and admission: every other base class, every declaring decorator, every request's parameter decorator and the type tokens, built on Zod, with `itinera/schema`, and the builder's every list with its checks, as the decorators', so that everything is declared and checked: steps, policies, roles, input adapters, service providers and rescue steps; every violation; the listing. Later stages make what is declared run.
5. Steps: resolving requests, each checked through the Standard Schema interface, `classOf` and the metadata's classes giving an instance through `fromValue`, building per attempt, input adapters with their requests and data bag access, outcomes, contributions, handles and the executor's signal, steps setting global metadata.
6. The scan and its decisions: statuses, retries, `retry on abnormal termination`, aborts, the result and `output`.
7. Policies, hooks and roles.
8. Services: providers of both scopes, their requests, events, data, global metadata and implementation names.
9. Rescue steps: the rescue, its requests, decisions and statuses, adapters and providers attached to `<step>_rescue`.
10. Test support: `itinera/testing`, the mocks moved there from `itinera/unstable`, what test support still lacks, the runner's test support sentences, `testing` claimed.
11. Release preparation: the API reference, the package overview, examples, the release workflow, ready for `0.1.0-beta.1`, published only after the maintainer merges the stack.
12. The book: the TypeScript edition of [itinera-dev/book](https://github.com/itinera-dev/book), a `typescript/` book beside `rust/`, following BOOK.md, its examples compiled and run against itinera-ts in CI, written as a chain of pull requests of its own in the book repository after stage 11, against the top branch of this repository's stack until the release.

A proposal is added to `proposals` in `conformance.json` only by the pull request that completes it, which says `Closes #N` for its implementation issue. A proposal is listed only once its cases are at the tag `conformance.json` pins; cases not merged yet are run locally from their pull request's branch. Proofs that a rule is impossible to express land with their feature, together with their entries under `impossible`.

## Code

- Formatting is plain Prettier, without configuration. It formats the code, the JSON and the YAML. Markdown is written by hand, with tables unpadded as in every itinera-dev repository, so `.prettierignore` leaves it out.
- Names use the specification's vocabulary exactly, in camelCase as proposal 0111 shows, such as `keepDefault`, `fromDataBag` and `isFirst`, and types in PascalCase.
- `tsconfig.json` turns on `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `experimentalDecorators` and `emitDecoratorMetadata`. Lint uses typescript-eslint's strict type-checked rules, with `no-floating-promises`, `no-explicit-any` and `switch-exhaustiveness-check` as errors.
- While a journey runs, no throw escapes `run`: every failure there becomes the journey's result, an abort or a failure, as the specification says. JavaScript has no failure that code can tell apart from a recoverable one, so every throw from custom code is caught. Before a journey, a refusal rejects `run` with a `Refusal`, and while a workflow is declared, a misuse that types cannot rule out throws, with a message saying what was wrong, such as an empty step name.
- Errors that itinera throws or rejects with, such as `Violations`, `Refusal` and the test mistakes, are subclasses of `Error`.
- Reuse before writing. Look first at the standard library and the web platform, then at packages the workspace already depends on, then at well-known packages. Write it ourselves only when none fits, or when a package would replace only a couple of lines. Judge a package by what it will replace across the project, not only by its first use. Every runtime dependency has a stated reason in the tech spec that adds it.
- Types hold every constraint of the specification and the plan that TypeScript can express: a branded type for a name, an `Attempt` type counted from 1 with `isFirst`, a discriminated union for a closed set of cases, and `readonly` everywhere. A documentation comment stating a constraint that the type could enforce means the type is wrong.
- Whatever TypeScript can refuse does not compile, and a type test shows it with `@ts-expect-error`. A rule that types cannot hold is checked at run time.
- Unions that carry data, such as `Event` and `Outcome`, are discriminated unions, matched with `ts-pattern`'s `match(...).exhaustive()`; a plain `switch` over one passes typescript-eslint's `switch-exhaustiveness-check`. Closed sets of names, such as hook kinds and statuses, are declared with `closedSet`, from `src/closed-set/declare.ts`, which gives their names, parsing and every value from one declaration.
- Decorators are the main way an application declares: a class extending one of itinera's base classes, marked with legacy decorators. A decorator gives way to another form only where section 4 of the plan says the language makes it impossible. The public builder, `builder()` and `build()` on a class extending `Workflow`, puts a workflow together from the lists of descriptors the decorators fill, and without decorators for applications that do not use them. It takes steps and policies only as classes extending itinera's base classes, reporters as classes implementing `Reporter`, and input adapters, providers and the ID generator as methods of the workflow class, never loose functions; a class without decorators gives its requests' tokens by position, each typed against its parameter. `Orders.build(...)`, or `Orders.builder().constructWith(...).build()` when the builder adds to the workflow, is how an application makes the workflow object it runs, in code, tests and examples, never `new Orders(...)`, except in the tests showing that such an object cannot make an instance.
- Modules follow concepts. Each type lives in the module of the concept it belongs to, named with the specification's vocabulary, never where it happens to be used first: `JourneyId` is in `journey`, though events use it before the result does. A type that only events need, such as who decided a decision, lives in `event`.
- Each public module is a subpath of the package, such as `itinera/journey`, and the package root exports nothing of its own. A module with submodules decides its public face: the submodules are private, and the module re-exports what applications use, so every public item is imported from one subpath, for example `import { JourneyId } from "itinera/journey"`. The engine is a private module, never exported.
- Each subpath is a CommonJS module, `src/<name>.ts`, with an ESM layer, `src/<name>.mts`, that only re-exports it: `export * from "./<name>.js";`. The `exports` map of `packages/itinera/package.json` gives `import` the layer and `require` the module, so an application never loads two copies, and a test checks both.
- A chain of array methods reads as a sentence of names, such as `.map(toNewFormat).filter(onlyOven).reduce(lesser)`, and the details live in the functions it names. Each step is a function name, or an arrow function whose whole body is one call, one method call or one property read, such as `(x) => toNewFormat(x, unit)`, `(tag) => tag.toString()` or `(step) => step.actions`; taking one element of a tuple, as in `([, script]) => script`, counts as a property read. Its arguments are names, literals, properties or one conversion of them, such as `String(name)`. An arrow function that does more, comparing (even through a method such as `.equals()`), negating, matching, computing, building a value or chaining calls, becomes a named function. An arrow function bound with `const` before the chain follows the same rule.
- Iterating to get a result uses array methods, not a `for` loop. A loop that searches, stopping with `return` or `break` once an item matches, is `find`, `findIndex`, `some` or `every`. One that builds a new value is `map`, `filter`, `flatMap` or `reduce`, or `Object.fromEntries` or `new Map` from entries. A `for...of` loop stays only when its body acts on each item, such as filling an existing model, delivering an event or asserting in a test, and it may stop early when that work fails. No lint rule catches these loops, so reviewers check them.
- Every module is a file of its own, and a module's submodules live in a directory of its name, such as `step/attempt.ts` beside `step.ts`.
- A file past 200 lines holds one thing. A file's length counts its code and its documentation; files under `tests` are not counted. Past 200 lines, a file holding two things, related or not, keeps one of them and moves each of the others to a private submodule of its own: `workflow.ts` keeps the module's re-exports, and the `Workflow` base class goes to `workflow/base.ts`, as the registry goes to `workflow/registry.ts`. A file that holds only re-exports, with its module's documentation, holds one thing, whatever its length. Only a file whose lines all belong to one class, interface or type, with its documentation, its own methods and the private helpers only it uses, may stay longer. A module whose parts all belong to one concept still splits along the seams inside it, such as reporters and dispatchers in `report`.
- Tests live in each package's `tests` folder, beside `src`, never in `src`, so the build compiles `src` alone and no test or fixture can reach the package. Unit tests are in `tests/unit`, whose folders and files mirror `src`: `src/value/capture.ts` is checked by `tests/unit/value/capture.test.ts`, which imports it from `src`. A test goes in the test file of the module whose code decides what it checks, even when it runs a whole journey to check it. A test of a parent module's own code stays with the parent, even when it needs the code of its submodules to run. Integration tests are in `tests/integration`, each file named after the flow it checks, such as `retry-then-rescue.test.ts`, and import only the subpaths applications write, never `src`. Tests of the package as a whole, such as its exports, its examples and the proofs, are integration tests too, named after what they check, and may read the package's own files, such as `package.json` and `src/*.mts`, without importing its modules. Fixtures that tests share are in `tests/fixtures`, named after what they serve, such as `tests/fixtures/engine.ts`. Lint keeps `src` from importing anything under `tests`, and integration tests from importing `src`. Type tests are `.test-d.ts` files placed by the same rules; the proofs of the rules made impossible are in `packages/itinera/tests/integration/proofs.test-d.ts`, one named test each.
- Nothing is exported from a module unless another module or an application needs it, and nothing is re-exported by a subpath unless applications need it. Public API of a proposal not yet listed is exported only from `itinera/unstable`, as "Pull requests and stacks" says.
- A lint rule is turned off only on the line that needs it, with `// eslint-disable-next-line <rule> -- <reason>`.
- Every line does something. Code, tests and examples hold no line that changes nothing, such as a `void value;` in an example to quiet a warning nothing raises, or a cast to the type a value already has.
- Every exported item has documentation in British spelling, describing its behaviour in its own words, with an example that compiles and runs. Examples are real files under `examples/`, compiled and run by the tests and pulled into the documentation with TypeDoc's `@includeCode`, so no example can rot.
- Documentation is written where an item is defined; TypeDoc carries it to every re-export. Examples import from the subpaths applications write, such as `import { Value } from "itinera/value"`, never from the package's source files.
- Test names state the rule as a sentence, for example `it("never commits a failed attempt's contributions")`.
- A rule checked on several inputs is one `it.each` test with a named case per input, never a run of assertions or a loop over a table. The test's name states the rule and each case's name says what its input is. When what varies is a class, such as the dispatcher, each case holds the class. A test over every value of a closed set, such as every hook kind, takes the set itself, so that a new value is checked without a new case.
- A chain that three or more tests of one module start the same way, from the same constructor or helper, becomes a helper of those tests, named for what it makes, such as `shopWorkflow()`. A nested `describe` counts on its own. When the tests go on differently, the helper makes only the part they share, so each test adds only what varies.

## Comments

- As few as possible. A comment explains a non-obvious reason, only when the code cannot.
- Code and comments never refer to specification sections, issues, pull requests or other documents. Git keeps that history, and the tech specs map rules to code.
- No `TODO` comments.

## Running the checks

After `npm ci`, each of these is a required CI check, and every one must pass before pushing:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck-oldest`
- `npm test`
- `npm run package`
- `npm run docs`
- `npm run dependency-check`
- `npm run release-actions`

`npm run check` runs them in this order, and stops at the first that fails. CI runs the tests on Linux on Node 22, 24 and 26, and on Windows and macOS on Node 24, and the rest on Node 24.

The `commit messages` check is required as well. Before pushing, run it on the commits not pushed yet, as docs/contributing.md "Commit messages and the changelog" says, since a pushed commit that has a layer of a stack above it cannot be reworded without rebasing that layer.

## Running the conformance runner

The runner is in `packages/conformance`. Run `npm run conformance`, which builds the package and the runner with `tsc` before it runs the cases, with:

- `ITINERA_CONFORMANCE_CASES` set to the `cases` directory of a checkout of itinera-dev/conformance at the tag pinned in `conformance.json`;
- `ITINERA_CONFORMANCE_TAGS` set to a Cucumber tag expression, for example `@proposal-0002 and not @non-value`;
- `ITINERA_CONFORMANCE_REPORT` set to the file the Cucumber JSON report is written to.

In CI the `run-conformance` action sets these from `conformance.json`.

The runner builds each scenario's workflow with the builder, from test support's mocks. The features under `packages/conformance/features/fixtures` drive workflows written by hand with the decorators, as an application writes them, reusing the sentences of the conformance cases with a Given sentence naming each workflow, such as `Given the payment workflow`.

## Pull requests and stacks

- Tier 1 is one long stack of pull requests, made with `gh stack`: one pull request per project thread, each layer based on the previous layer's branch, and the threads run one after another. A stage is one or more layers, in the plan's order, and no layer merges until the maintainer merges the stack. Every layer passes all of `main`'s checks.
- Every pull request names an open issue in this repository: `Refs #N` when it contributes, `Closes #N` when it finishes. Work that belongs to no proposal refers to #1, or to an issue of its own.
- Public API of a proposal not yet listed in `conformance.json`, or of one the specification has not accepted yet, is exported only from the subpath `itinera/unstable`. So is a listed proposal's API while it holds a stand-in that a later stage replaces, or names API of a proposal not yet listed.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/). The subject is `type(scope): description`, or `type: description`, with the description in the imperative and starting in lower case, such as `feat(step)!: give an attempt a type of its own`. The type is one of `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `ci`, `build`, `chore` and `revert`. The scope, when there is one, is a module or an area, such as `step`, `value`, `release` or `conformance`. A `!` before the colon marks a change that breaks code written for the last release. The body says what changed and why, in plain prose.
- A commit that changes what an application meets, compared with the last release, carries its changelog entries as trailers, in the paragraphs that close the message, after the body: one `Added:`, `Changed:`, `Fixed:` or `Removed:` line per entry, before `Refs #N` or `Closes #N`. An entry says what an application meets, by its subpath and name, such as `Read.present` in `itinera/journey`, and for a breaking change what replaces what is gone. A `feat`, `fix` or breaking commit that changes nothing an application meets, such as a fix to work no release has shipped yet, says `Changelog: none` instead. The `commit messages` check refuses a message that breaks this form, and git-cliff builds each release's changelog section from the entries, as `docs/contributing.md` says.
- Pull requests merge with a merge commit, never squashed, since a squash folds every commit's trailers into one message.
- Pull request descriptions say what changed and why, in plain prose.
- Every change an agent makes is also reviewed by a separate reviewer agent. A new pull request is reviewed before it is opened, since that is the version the maintainer reads first. A later change to an open pull request is pushed as soon as the checks under "Running the checks" that it calls for pass, and is reviewed while CI runs; an accepted finding becomes a further push, reviewed in the same way. A review passes when it has no accepted finding left.

## Writing

- Everything is written for a screen reader: headings, lists, prose and simple tables.
- Never ASCII-art diagrams, arrows drawn with characters or box-drawing trees, in replies, documents or code. Diagrams are Mermaid, with `accTitle` and `accDescr`, and text saying everything they show.

## Working with the maintainer

- Start every reply with a heading.
- When a design decision is open, present one decision at a time, with a recommendation, and wait for the answer.
- Tell the maintainer a pull request is ready for review only when both the review and the CI of its latest push have passed, as soon as the later of the two does.
