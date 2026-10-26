import io
import pathlib
import tarfile
import tempfile
import unittest

from lib.cases import extract, proposals_in, proposals_of_tiers, tier_of

FEATURE = """\
@proposal-0002
Feature: Steps

  Rule: Retries

    @proposal-0009 @capability-async # a comment @proposal-0099
    Scenario: A retry
      Given a step
      \"\"\"
      @proposal-0077
      \"\"\"

    Scenario Outline: Several
      Given <n>

      @proposal-0010
      Examples:
        | n |
"""


class ProposalsIn(unittest.TestCase):
    def test_every_tag_line_names_its_proposals(self):
        self.assertEqual(proposals_in(FEATURE), {2, 9, 10})


class TierOf(unittest.TestCase):
    def test_a_feature_under_a_tier_folder_has_that_tier(self):
        self.assertEqual(tier_of("cases/tier-2/steps.feature"), 2)

    def test_a_feature_outside_any_tier_folder_has_none(self):
        self.assertIsNone(tier_of("cases/capabilities/testing.feature"))


def archive_of(files):
    """A repository tarball, as GitHub serves it, holding `files` under one root folder."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for path, text in files.items():
            data = text.encode()
            info = tarfile.TarInfo(f"conformance-abc/{path}")
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


class ProposalsOfTiers(unittest.TestCase):
    def test_only_the_tiers_claimed_count(self):
        files = {
            "cases/tier-1/steps.feature": "@proposal-0002\nFeature: A",
            "cases/tier-1/more/retries.feature": "@proposal-0009\nFeature: B",
            "cases/tier-2/switches.feature": "@proposal-0200\nFeature: C",
            "cases/capabilities/testing.feature": "@proposal-0108\nFeature: D",
        }
        with tempfile.TemporaryDirectory() as into:
            root = extract(archive_of(files), into)
            self.assertEqual(root.name, "conformance-abc")
            self.assertEqual(proposals_of_tiers(root, 1), {2, 9})
            self.assertEqual(proposals_of_tiers(pathlib.Path(root), 2), {2, 9, 200})
