# Contributing to itinera-ts

This guide covers what is specific to the TypeScript implementation. The rules every itinera-dev repository follows are in the [organisation's contributing guide](https://github.com/itinera-dev/.github/blob/main/CONTRIBUTING.md), and the full process is in [PROCESS.md](https://github.com/itinera-dev/spec/blob/main/PROCESS.md).

## How work arrives here

What Itinera does is defined in [itinera-dev/spec](https://github.com/itinera-dev/spec): the proposals (the PRDs) and the behaviour specification. How TypeScript does it is defined here, in **tech specs**.

1. Each accepted proposal gets an **implementation issue** here, labelled `implements-proposal`. An issue opened before its proposal is accepted also carries `waiting for spec`, and no pull request is opened for it until that label is removed.
2. The TypeScript **tech spec** is agreed in that issue: API shape, subpaths and modules touched, types, decorators, error handling, tests and the definition of done.
3. The implementing pull request adds the tech spec as `docs/specs/NNNN-short-name.md`, where `NNNN` is the proposal's number, together with the code.
4. The issue closes when the proposal's [conformance](https://github.com/itinera-dev/conformance) cases pass.

Bugs and TypeScript API questions can be opened here directly; changes to behaviour are proposals in the spec repository.

## The plan being implemented

Tier 1 is implemented following the [tier 1 plan](tier-1-plan.md), in stages tracked in [#1](https://github.com/itinera-dev/itinera-ts/issues/1). The plan holds the architecture, the tests, the order of work and the tooling; each proposal's tech spec holds what concerns that proposal alone. From stage 3, `architecture.md` draws what has been built, and is kept true by every pull request.

## The workspace

An npm workspace, under `packages/`:

| Package | Published | Holds |
|---|---|---|
| `itinera` | yes | What applications depend on: one subpath per concept, such as `itinera/step`, and test support at `itinera/testing` |
| `itinera-conformance` | no | The conformance runner |

`itinera` is one CommonJS build, with a thin ESM layer that only re-exports it, so `import` and `require` both work and an application never loads two copies. Each subpath is a module `src/<name>.ts`, built to `dist/<name>.js`, and its layer `src/<name>.mts`, built to `dist/<name>.mjs`; the `exports` map of `packages/itinera/package.json` gives each its condition.

The subpath `itinera/unstable` holds API that the specification has not accepted yet, and, before a proposal is listed in `conformance.json`, that proposal's API. It does not exist yet.

## Building and testing

`itinera` supports Node 22.12 and later. Working on it needs the latest Node 22 or a later version, since some of the tools need it, and `npm ci` installs everything else, at the exact versions of `package-lock.json`. `.npmrc` makes npm write exact versions into `package.json`.

TypeScript is pinned at 6.0, because typescript-eslint, whose type-aware rules matter for an asynchronous engine, supports only versions below 6.1. Moving to TypeScript 7 waits until it supports that. Applications may use TypeScript 5.0 or later.

Vitest runs the tests through its swc plugin, `unplugin-swc`, since esbuild records no decorator metadata. It reads the compiler options from `tsconfig.json`, and runs the type tests, `*.test-d.ts`, with `tsc`.

Every one of these is a required check in CI:

- `npm run format`: Prettier, without configuration, checks the formatting of every file but Markdown;
- `npm run lint`: ESLint with typescript-eslint's strict type-checked rules, with no warning allowed;
- `npm run typecheck`: `tsc` over the whole repository with `tsconfig.json`, then over the package's sources alone, without Node's types, since the package uses only the language and the web platform;
- `npm test`: Vitest, with its type checking;
- `npm run package`: builds the package, then checks what it publishes with [publint](https://publint.dev/) and [Are the types wrong?](https://arethetypeswrong.github.io/), for Node 16 resolution and bundlers, since the package's subpaths need `exports`;
- `npm run docs`: the API reference, with TypeDoc, warnings as errors and every exported item documented;
- `npm run dependency-check`: `npm audit` for advisories, then [licensee](https://www.npmjs.com/package/licensee) for licences.

`npm run check` runs them in this order, and stops at the first that fails. CI runs the tests on Linux on Node 22 and 24, the LTS lines, and on Node 26, the current release, and on Windows and macOS on Node 24; the other checks run on Node 24. Each week, CI also tries the type check and the tests on the next TypeScript, and the tests on the newest Node.

### Licences

`.licensee.json` allows the licences that `deny.toml` allows in itinera-rs, with `BlueOak-1.0.0` and `CC0-1.0`, which many of npm's own packages use. It checks every package installed, the tools included. The exceptions are tools that applications never receive: `argparse`, under `Python-2.0`, which TypeDoc uses through `markdown-it`; `lightningcss`, under `MPL-2.0`, which Vite uses for CSS; and `spdx-exceptions`, `spdx-expression-validate` and `spdx-ranges`, which carry `CC-BY-3.0` for their data, and which licensee itself uses.

## Conformance in CI

`conformance.json` pins the conformance cases, lists the proposals implemented and the capabilities claimed, and maps each scenario excluded as impossible to express to the test that proves it. A proposal is listed only by the pull request that completes it.

In CI, the `run-conformance` action of [itinera-dev/actions](https://github.com/itinera-dev/actions) reads `conformance.json`, checks the excluded scenarios, runs the scenarios whose proposals are all listed, and writes the report. While no proposal is listed, it checks the manifest without starting the runner, which arrives in stage 2 as `npm run conformance`.

## Commit messages and the changelog

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), and each commit that changes what an application meets carries its changelog entries as trailers, which [git-cliff](https://git-cliff.org/) gathers into a release's section of `CHANGELOG.md`. For example:

```text
feat(step)!: give an attempt a type of its own

An attempt's number was a bare number, so nothing said that it
counted from 1 or named the first attempt.

Added: `Attempt` in `itinera/step`, an attempt's number, counted from 1, with `isFirst()`.
Changed: An attempt's number is an `Attempt` instead of a `number` wherever it is public.
Refs #N
```

1. The subject is `type(scope): description`, or `type: description`. The types are `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `ci`, `build`, `chore` and `revert`, and the scope is a module or an area, such as `step`, `value`, `release` or `conformance`. A `!` before the colon marks a change that breaks code written for the last release.
2. The body, after a blank line, says what changed and why.
3. The trailers close the message: one `Added:`, `Changed:`, `Fixed:` or `Removed:` line for each changelog entry, then `Refs #N` or `Closes #N`. An entry says what an application meets, by its subpath and name, and for a breaking change what replaces what is gone. Changes to CI, the release workflow or the documentation have entries only when they change what is published or how.
4. A `feat`, `fix` or breaking commit with no entry, such as a fix to work that no release has shipped yet, says `Changelog: none`.

The required `commit messages` check runs the `commit-messages` action of [itinera-dev/actions](https://github.com/itinera-dev/actions) on every commit of a pull request other than merges. It refuses a subject of another form, a type outside the list, a body that does not follow a blank line, a `feat`, `fix` or breaking commit with neither entries nor `Changelog: none`, entries together with `Changelog: none`, and any entry that git-cliff would not read, would cut short or would read with more attached, such as an entry on several lines or a misspelt section. It does not check the wording. Before pushing, `PYTHONPATH=<actions> python3 <actions>/commit-messages/main.py origin/main..HEAD`, run in this repository with `<actions>` a checkout of itinera-dev/actions and Python 3.11 or later, checks the local commits the same way.

Pull requests merge with a merge commit, never squashed, because a squash folds every commit's trailers into one message. A commit's entries cannot change once it merges, so the release pull request reconciles entries that a later commit made untrue.

`cliff.toml` holds git-cliff's template. `git cliff --unreleased --tag v<version> --strip all` prints the section for `<version>` from the entries of the commits since the last release. The template is written for git-cliff 2.14.2, which installs with `npm install --global git-cliff@2.14.2` or `pip install git-cliff==2.14.2`.

## Releasing

Only `itinera` is published. A maintainer requests a release by pushing, on `main`, an annotated tag `v` followed by its version, such as `v0.1.0-beta.1`, with the message `itinera <version>`, after the pull request that sets the version and adds its section to `CHANGELOG.md` has merged. The release workflow, `.github/workflows/release.yml`, then runs four jobs, each waiting for the one before:

1. **release gate**: the `release-gate` action refuses the tag unless it matches the version in `packages/itinera/package.json`, the commit is on `main`, `CHANGELOG.md` has a section for the version, and `conformance.json` lists every tier 1 proposal of the pinned cases;
2. **CI**: the whole of `.github/workflows/ci.yml` runs again on the tagged commit, since its run on `main` after a merge blocks nothing, and its conformance job keeps the report;
3. **npm**: in the `npm` environment, which only tags `v*` may use, `npm publish --workspace packages/itinera` builds the package and publishes it through trusted publishing, which exchanges the workflow's identity for a short-lived token and adds provenance;
4. **GitHub release**: the `create-release` action creates the release with the notes of the version's changelog section, as a pre-release for a version such as `0.1.0-beta.1`, and attaches the conformance report.

npm makes any version it publishes `latest` unless told otherwise, so a version with a pre-release part is published under the dist-tag `next`, which `publishConfig.tag` in `packages/itinera/package.json` sets. The release pull request sets it for such a version and removes it for any other.

Before pushing the tag, the maintainer runs `npm publish --workspace packages/itinera --dry-run` at the commit to be tagged, since a tag whose publish job fails has no release. npm trusts only `release.yml` in this repository, running in the `npm` environment, so no token is stored anywhere. npm configures trusted publishing only on a package that already exists, so the maintainer publishes the first version by hand, and the workflow publishes every later one. If the publish job fails, the maintainer publishes the version by hand from the tagged commit, and creates the GitHub release by hand with the notes of the version's changelog section and the conformance report the workflow kept.

npm packs only a package's own directory, so `packages/itinera` holds its own copy of `LICENSE-MIT` and `LICENSE-APACHE`. A change to either file at the root of the repository is made to every copy.
