---
name: release
description: How Claude prepares a release of the itinera package on npm, and carries it into the book and the site. Use when the maintainer asks for a release, when writing a version's changelog section, and as soon as a release reaches npm.
---

# Releasing

The "Releasing" section of [docs/contributing.md](../../../docs/contributing.md) says how a release runs: the tag, the release gate, the release workflow and its six jobs, trusted publishing, the dist-tag, the first version, which the maintainer publishes by hand, and the API reference on GitHub Pages. This skill adds only the part Claude does.

Claude never pushes a tag and never publishes to npm. The maintainer pushes the tag, and the release workflow publishes.

## The release pull request

One pull request, titled "Release <version>" with a release commit `chore(release): release <version>`, sets the version and writes its changelog section. It names its issue as AGENTS.md says, normally #1, the tier 1 tracking issue.

1. Branch from the latest `main`.
2. After `git fetch --tags`, list what changed since the last release with `git log v<last version>..origin/main`, and read each commit's message, its changelog trailers included.
3. Raise the version:
   - in `packages/itinera/package.json`, `package-lock.json` and the `itinera` dependency of `packages/conformance/package.json`: set that dependency to `<version>` first, since npm looks a version the workspace no longer holds up on the registry, then run `npm version <version> --workspace packages/itinera --no-git-tag-version`;
   - in the status paragraph of `README.md`.
4. Set the dist-tag: `publishConfig.tag` in `packages/itinera/package.json` is `next` for a version with a pre-release part, such as `0.1.0-beta.1`, and is removed for any other version, which npm then publishes as `latest`. For the first version without a pre-release part, also remove from `packages/itinera/README.md` the sentence saying that every version is a pre-release under `next`.
5. Check that `conformance.json` lists every tier 1 proposal of the cases it pins, except one whose every case needs a capability it does not claim, which the release gate in docs/contributing.md "Releasing" requires. If it does not, stop and tell the maintainer, since the tag would be refused.
6. Write the version's section at the top of `CHANGELOG.md`, above the last release's, in the form of the sections below it:
   - `git cliff --unreleased --tag v<version> --strip all` prints the heading `## [<version>]` and the entries that commits since the last release carry as trailers, under `### Added`, `### Changed`, `### Fixed` and `### Removed`, each only when it has entries; `docs/contributing.md` "Commit messages and the changelog" says how;
   - after the heading, one paragraph naming which release it is, whether it breaks code written for the last one, the specification version, the tier, the capabilities, the conformance cases of `conformance.json`, the oldest Node and TypeScript versions supported, and saying "What a journey does is unchanged" when that is so;
   - the heading's link at the bottom of the file, to `releases/tag/v<version>`.
7. Reconcile the entries, since a commit's entries cannot change once it merges. Each entry follows AGENTS.md, and the section as a whole says what an application meets, compared with the last release:
   - entries that a later commit made untrue, such as an addition renamed before the release, become one entry saying what the release holds;
   - entries that say the same thing merge;
   - nothing that was already true in the last release, which `git show v<last version>:<file>` settles;
   - nothing about how the documentation spells something the language already allowed, such as a type annotation the language lets code leave out;
   - a commit since the last release that changes what an application meets but carries no entry gets its entry here; changes to CI, the release workflow or the documentation get one only when they change what is published or how, as docs/contributing.md "Commit messages and the changelog" says.
8. Move `book.json` to the head of the book's `next`, as docs/contributing.md "The book in CI" says. `git ls-remote https://github.com/itinera-dev/book refs/heads/next` gives it.
9. Check the change against every condition of the release gate. Run the checks of AGENTS.md "Running the checks", and have the change reviewed as the `review-change` skill says. Ask the reviewer to check every changelog entry against the code at both versions, and the section against the entries git-cliff printed.
10. Open the pull request, in a cloud session with the REST form the `stack` skill gives, and report it as AGENTS.md "Working with the maintainer" says.

## After the merge

1. Give the maintainer the commands that make the tag docs/contributing.md "Releasing" describes, at `main`'s merge commit:
   1. `git fetch origin`
   2. `git switch --detach <commit>`
   3. `npm ci`
   4. `npm publish --workspace packages/itinera --dry-run`
   5. for the first version only, `npm publish --workspace packages/itinera`, since npm sets up trusted publishing only for a package that exists;
   6. `git tag -a v<version> <commit> -m "itinera <version>"`
   7. `git push origin v<version>`

   Once it is pushed, check with `git ls-remote origin 'refs/tags/v<version>*'` that it shows a tag object, and a `^{}` line naming the commit.
2. Once the release workflow has finished, check that:
   - `itinera` is on npm at the version, under the dist-tag of step 4, with provenance unless it is the first version, which the maintainer published by hand, which `npm view itinera@<version>` and `npm view itinera dist-tags` show;
   - the GitHub release exists, marked as a pre-release when the version has a pre-release part such as `-beta.1`, with the changelog section, the conformance report and `api-reference.tar.gz`;
   - GitHub Pages have deployed again, and serve the version's reference at `https://itinera-dev.org/itinera-ts/<version>/` and at `https://itinera-dev.org/itinera-ts/`, each front page naming the version.

   If publishing failed, tell the maintainer, pointing at docs/contributing.md "Releasing". If only the last job failed, the reference was not deployed, and re-running that job is enough, once whatever stopped it, such as the `github-pages` environment refusing the tag, is put right.

## Once the package is published

As soon as `itinera` is on npm at the version, Claude carries the release into the book and the site without waiting to be asked. The maintainer's standing preference is that both changes are pushed straight to each repository's `main`, with no pull request, once the checks its own manual asks for pass and a separate reviewer has passed them. When this session cannot reach a repository, Claude asks the maintainer for a thread working on it, and passes that preference on.

1. **The book**, itinera-dev/book, follows the release as its BOOK.md says in "How the examples are checked": `next` merges into `main`, whose `typescript` directory then names the released version, and the prose naming the release, such as the installing chapter and the appendix on what the version supports, is raised to it. Once that commit is on the book's `main`, give the maintainer the commands that tag it:
   1. `git fetch origin`
   2. `git tag -a typescript-<version> <commit> -m "The TypeScript book for itinera <version>"`
   3. `git push origin typescript-<version>`

   The tag freezes its commit as the version's edition, so it goes only on the commit whose prose names the new version.
2. **The site**, itinera-dev/itinera-dev.github.io, follows each language's release, as its own manual says. For TypeScript:
   - in `src/data/languages.json`, the TypeScript entry's `state` becomes `released`, and its `version`, `install`, `tier` and `executors` match the release and its `conformance.json`, with the other fields a released entry has;
   - in the `facts` of `site.config.mjs`, `conformance-ref` matches the cases `conformance.json` pins;
   - a post under `content/news/` announces the release.
