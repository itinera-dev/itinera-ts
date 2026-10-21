"""The conformance cases: which proposals the scenarios of each tier carry."""

import re

PROPOSAL_TAG = re.compile(r"@proposal-(\d+)")
TIER_PATH = re.compile(r"cases/tier-(\d+)/")


def tags_of(line):
    return line.split("#", 1)[0].split()


def tag_lines(text):
    """The lines of a feature file holding tags, leaving out its doc strings."""
    in_doc_string = None
    for raw in text.splitlines():
        line = raw.strip()
        if in_doc_string:
            if line.startswith(in_doc_string):
                in_doc_string = None
        elif line.startswith(('"""', "```")):
            in_doc_string = line[:3]
        elif line.startswith("@"):
            yield line


def proposals_in(text):
    """Every proposal a feature file's tags name, on its feature, rules, scenarios or examples."""
    return {
        int(match.group(1))
        for line in tag_lines(text)
        for tag in tags_of(line)
        if (match := PROPOSAL_TAG.fullmatch(tag))
    }


def tier_of(path):
    """The tier of a feature file, from its folder `cases/tier-N/` relative to the cases' root, or None."""
    match = TIER_PATH.match(path)
    return int(match.group(1)) if match else None


def proposals_of_tiers(root, highest):
    """The proposals the feature files of tiers 1 to `highest` carry, under `root`/cases."""
    return {
        proposal
        for path in sorted(root.joinpath("cases").rglob("*.feature"))
        if (tier := tier_of(path.relative_to(root).as_posix())) is not None and tier <= highest
        for proposal in proposals_in(path.read_text(encoding="utf-8"))
    }

