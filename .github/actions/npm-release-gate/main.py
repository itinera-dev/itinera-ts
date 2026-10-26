"""Decide whether a pushed tag becomes a release of an npm package."""

import os
import pathlib
import sys
import tempfile
from typing import NoReturn

from lib.cases import proposals_of_tiers
from lib.http import GitHub, RequestError, npm_versions
from lib.release import (
    changelog_section,
    compare_path,
    conformance_problems,
    dist_tag_problems,
    lock_problems,
    on_branch,
    package_of,
    read_json,
    tag_problems,
    tier_problems,
)


def fail(problems) -> NoReturn:
    print("The release gate refused this tag:")
    for problem in problems:
        print(f"::error::{problem}")
    sys.exit(1)


def read(path, found):
    """The text of `path`, or None after adding to `found` why it cannot be read."""
    try:
        return pathlib.Path(path).read_text(encoding="utf-8")
    except (OSError, ValueError) as error:
        found.append(f"{path} cannot be read: {error}")
        return None


def read_manifest(path):
    """The JSON object in `path`; stops the gate when it cannot be read."""
    found = []
    text = read(path, found)
    if text is None:
        fail(found)
    try:
        return read_json(path, text)
    except ValueError as error:
        fail([str(error)])


def main():
    env = os.environ
    repo, tag, branch, directory = env["REPO"], env["TAG"], env["BRANCH"], env["PACKAGE"].rstrip("/")
    conformance_repo = env.get("CONFORMANCE_REPO") or f"{repo.split('/')[0]}/conformance"
    github = GitHub(env["GH_TOKEN"])
    try:
        claimed = int(env["TIER"])
    except ValueError:
        fail([f'The input "tier" must be a number, not "{env["TIER"]}".'])
    if claimed < 1:
        fail([f"The tier claimed must be 1 or more, not {claimed}."])

    manifest = read_manifest(f"{directory}/package.json")
    try:
        name, version = package_of(manifest)
    except ValueError as error:
        fail([str(error)])
    print(f"Tag {tag}, {name} {version}, tier {claimed} claimed.")
    found = tag_problems(env["REF_TYPE"], tag, version)
    found += lock_problems(read_manifest("package-lock.json"), directory, version)
    found += dist_tag_problems(manifest, version)

    try:
        compared = github.get(compare_path(repo, env["SHA"], branch))
    except RequestError as error:
        fail([*found, f"The tagged commit cannot be compared with {branch}: {error}"])
    if compared is None or not on_branch(compared["status"]):
        found.append(f"The tagged commit {env['SHA']} is not on {branch}.")

    changelog = read(env["CHANGELOG"], found)
    if changelog is not None and changelog_section(changelog, version) is None:
        found.append(f'{env["CHANGELOG"]} has no notes for {version}, under a heading such as "## [{version}]".')

    conformance = read_manifest("conformance.json")
    shape = conformance_problems(conformance)
    if shape:
        fail([*found, *shape])
    try:
        root = github.extract_repository(
            conformance_repo, conformance["cases"], tempfile.mkdtemp(dir=env.get("RUNNER_TEMP"))
        )
    except RequestError as error:
        fail([*found, f"The cases at {conformance_repo}@{conformance['cases']} cannot be downloaded: {error}"])
    found += tier_problems(proposals_of_tiers(root, claimed), conformance["proposals"], claimed)

    if found:
        fail(found)
    try:
        published = version in npm_versions(name)
    except RequestError as error:
        fail([f"The npm registry cannot be read: {error}"])
    if published:
        print(f"::notice::{name} {version} is on npm already, so the publish step leaves it as it is.")
    print(f"{tag} may be released: cases {conformance_repo}@{conformance['cases']}, tier {claimed}.")


if __name__ == "__main__":
    main()
