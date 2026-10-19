---
name: stack
description: How Claude opens, links, updates and follows a stack of pull requests in itinera-ts. Use when a layer of tier 1's stack is opened, before amending or force-pushing a branch in a stack, when a lower layer changes or merges, and when deciding whether to rebase an upper layer.
---

# Stacks of pull requests

[AGENTS.md](../../../AGENTS.md) says that tier 1 is one long stack of pull requests, one pull request per project thread, each layer based on the previous layer's branch, and when a pull request is ready to report. This skill is how Claude opens and follows the stack.

In cloud sessions, `gh` works only through REST. GraphQL is refused, so `gh pr create`, `gh pr edit` and the `gh stack` extension do not work there; the REST forms are given below.

## Opening a stack

1. Push one branch per layer. Each layer passes all of `main`'s checks on its own.
2. Have every layer reviewed before it is opened, as the `review-change` skill describes.
3. Open the layers one after another, one per thread, each when its thread's work is ready. Each pull request's base is the branch of the layer below, and the bottom one's base is `main`.
   - Locally: `gh pr create --base <lower branch> --head <branch> --title <title> --body-file <file>`.
   - In the cloud: `gh api -X POST repos/itinera-dev/itinera-ts/pulls -f title=<title> -f head=<branch> -f base=<lower branch> -F body=@<file>`.
4. Assign each pull request to the maintainer, whose GitHub login is the account `gh api user --jq .login` returns: `gh api -X POST repos/itinera-dev/itinera-ts/issues/<number>/assignees -f 'assignees[]=<login>'`.
5. Link each layer into the stack as it is opened, if the stacks API allows appending a layer; otherwise leave the layers unlinked, as in "A layer outside the stack", and link them all in one call once the last layer is open:
   - Locally, with the `gh stack` extension; `gh stack --help` lists its commands.
   - In the cloud, the stack is created with its first layers, ordered bottom first: `echo '{"pull_requests":[<bottom>,<next>]}' | gh api -X POST repos/itinera-dev/itinera-ts/stacks --input -`. Each later layer is appended as it is opened with `POST repos/itinera-dev/itinera-ts/stacks/<number>/add`, if the API allows it. Otherwise, once the last layer is open, the stack is created with every layer at once: `[<bottom>,<middle>,<top>]`.
   - Then check that the stack lists them, with `gh api repos/itinera-dev/itinera-ts/stacks`. A stack is addressed by its `number`.

## While the stack is open

GitHub restacks on merge. When a lower layer merges, GitHub retargets the next layer to `main`, and rebases every layer above it. So a lower layer can gain commits freely while the stack is open, and the upper layers are never rebased by hand:

- A fix to a lower layer is pushed to that layer's branch only, as a new commit. Do not amend or force-push a layer that has a layer above it: the upper pull request's diff is taken from the last commit the two branches share, so a rewritten lower commit would show up in the upper diff as if it were part of it. New commits keep every diff exact until the merge. The one exception is a commit message the `commit messages` check refuses: the `commit` skill says how to reword it and rebase the layers above.
- An upper layer changes only for its own content. It does not contain a lower layer's fix until that layer merges and GitHub restacks it. If the fix changes something an upper layer relies on, wait for the merge, then sync the upper layer as described below, add a commit, run the checks and push. If GitHub cannot restack a layer, rebase it and every layer above it by hand, bottom first, each onto the new head of the layer below, as in "A layer outside the stack".
- Locally, `gh stack rebase` and `gh stack sync` can rebase the whole stack at once, but nothing requires it.

Never merge a lower branch into an upper one. GitHub's restack drops merge commits and may then conflict.

### Syncing a local branch

When a lower layer merges, GitHub's restack rewrites the upper branches, so local copies go stale. Before working on a layer after a merge:

1. `git switch <branch>`.
2. Before fetching, make sure nothing local would be lost: `git status --short` and `git log origin/<branch>..HEAD` both print nothing. After a fetch, the rewritten branch no longer contains the old commits, so compare with `origin/<branch>@{1}` instead.
3. `git fetch origin`. Go on only once GitHub has restacked the branch: `git merge-base --is-ancestor origin/main origin/<branch>` succeeds, or the pull request shows a new force-push. Otherwise wait and fetch again.
4. `git reset --hard origin/<branch>`.

## A layer outside the stack

When the stacks API cannot append a layer to a stack that exists already, through `POST stacks/<number>/add` or, locally, `gh stack`, each layer stays unlinked from the moment it is opened until the last layer is open and the whole stack is linked in one call. Until then, it is a layer outside the stack, and what follows applies to it. A layer that would belong in the middle of a stack is better opened as a separate pull request after the stack merges.

GitHub never restacks an unlinked layer. Whenever any layer below it merges, either the layer directly below it merged, or GitHub rewrote that layer, which is the unlinked layer's base. Either way its diff would show the old commits. Then:

1. Find the commit it was built on, the old head of the layer below, before fetching: `git merge-base <branch> origin/<lower branch>`. If the layer below was rewritten and a fetch already happened, it is `origin/<lower branch>@{1}`.
2. `git fetch origin`, then `git rebase --onto <new base> <old base commit> <branch>`. The new base is `origin/main` if the layer directly below merged, since its branch is deleted or left at its old head, and `origin/<lower branch>` otherwise.
3. Run the checks and push with `git push --force-with-lease`.
4. If the layer directly below it was the one that merged, point the pull request at `main`, unless GitHub already did: `gh api -X PATCH repos/itinera-dev/itinera-ts/pulls/<number> -f base=main`.

## Reporting

A message about a stack lists its pull requests bottom first, in the order they merge.
