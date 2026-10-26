"""Releases of an npm package: its version, the tag requesting it, its dist-tag, its changelog and the tier claimed."""

import json
import re

HEADING = re.compile(r"##[ \t]+\[?v?(\d[^\]\s]*).*")
SECTION_END = re.compile(r"#{1,2}[ \t]|\[[^\]]+\]:\s")


def read_json(name, text):
    """The JSON `text` of the file called `name`; raises ValueError saying which file cannot be read."""
    try:
        return json.loads(text)
    except ValueError as error:
        raise ValueError(f"{name} cannot be parsed: {error}") from error


def package_of(manifest):
    """The name and version a package.json declares; raises ValueError when either is missing."""
    if not isinstance(manifest, dict):
        raise ValueError("The package manifest must hold an object.")
    name, version = manifest.get("name"), manifest.get("version")
    if not isinstance(name, str) or not isinstance(version, str):
        raise ValueError('The package manifest must declare its "name" and "version".')
    return name, version


def is_prerelease(version):
    """Whether a version has a pre-release part, as in 0.1.0-beta.1."""
    return "-" in version.split("+", 1)[0]


def tag_problems(ref_type, tag, version):
    """Why `tag` cannot request the release of `version`."""
    if ref_type != "tag":
        return [f"A release is requested by pushing a tag, not a {ref_type or 'ref'} ({tag})."]
    if tag != f"v{version}":
        return [f'The tag {tag} does not match the package version {version}; it must be "v{version}".']
    return []


def lock_problems(lock, directory, version):
    """Why package-lock.json does not record `version` for the workspace package in `directory`."""
    packages = lock.get("packages") if isinstance(lock, dict) else None
    entry = packages.get(directory) if isinstance(packages, dict) else None
    locked = entry.get("version") if isinstance(entry, dict) else None
    if locked != version:
        return [f"package-lock.json records {locked or 'no version'} for {directory}, not {version}; run npm install."]
    return []


def dist_tag_problems(manifest, version):
    """Why the dist-tag `publishConfig.tag` sets does not suit `version`.

    npm makes any version it publishes `latest` unless told otherwise, so a pre-release goes under `next`, and any
    other version under `latest`, which is npm's own default.
    """
    publish_config = manifest.get("publishConfig", {})
    tag = publish_config.get("tag") if isinstance(publish_config, dict) else None
    if is_prerelease(version) and tag != "next":
        return [f'{version} is a pre-release, so publishConfig.tag must be "next", not {json.dumps(tag)}.']
    if not is_prerelease(version) and tag not in (None, "latest"):
        return [f'{version} is not a pre-release, so publishConfig.tag must be removed, not "{tag}".']
    return []


def compare_path(repo, sha, branch):
    """The GitHub comparison from a commit to a branch, whose status says whether the branch contains the commit."""
    return f"/repos/{repo}/compare/{sha}...{branch}?per_page=1"


def on_branch(compare_status):
    """Whether a commit is on a branch, given the status of GitHub's comparison from the commit to the branch."""
    return compare_status in ("ahead", "identical")


def changelog_section(text, version):
    """The notes of the changelog's section for `version`, or None when it has no section or the section is empty.

    The section starts at a heading such as "## [0.1.0]" and ends at the next heading of level 1 or 2, or at the link
    definitions that close a changelog, such as "[0.1.0]: https://...".
    """
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines) if heading_version(line) == version), None)
    if start is None:
        return None
    end = next((i for i in range(start + 1, len(lines)) if SECTION_END.match(lines[i])), len(lines))
    return "\n".join(lines[start + 1:end]).strip() or None


def heading_version(line):
    """The version a second-level heading names, or None for any other line."""
    match = HEADING.fullmatch(line.rstrip())
    return match.group(1) if match else None


def conformance_problems(manifest):
    """What is wrong with the parts of a conformance.json manifest the release gate reads."""
    found = []
    if not isinstance(manifest, dict):
        return ["conformance.json must hold an object."]
    if not isinstance(manifest.get("cases"), str) or not manifest.get("cases"):
        found.append('"cases" in conformance.json must be the tag of the conformance cases, such as "v0.1.0".')
    proposals = manifest.get("proposals")
    if not isinstance(proposals, list) or not all(isinstance(n, int) and not isinstance(n, bool) for n in proposals):
        found.append('"proposals" in conformance.json must be a list of proposal numbers.')
    return found


def tier_problems(required, listed, claimed):
    """The proposals of tiers 1 to `claimed`, `required`, that conformance.json does not list."""
    if not required:
        return [f"The cases hold no proposal of tiers 1 to {claimed}."]
    return [
        f"Proposal {n:04d}, of tier {claimed} or below, is not listed in conformance.json."
        for n in sorted(required - set(listed))
    ]
