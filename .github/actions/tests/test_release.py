import unittest

from lib.release import (
    changelog_section,
    compare_path,
    conformance_problems,
    dist_tag_problems,
    is_prerelease,
    lock_problems,
    on_branch,
    package_of,
    read_json,
    tag_problems,
    tier_problems,
)

CHANGELOG = """\
# Changelog

## [0.1.0-beta.2]

The second beta.

### Added

- Everything.

## [0.1.0-beta.1]

## 0.0.1

- A placeholder.

[0.1.0-beta.2]: https://github.com/o/r/releases/tag/v0.1.0-beta.2
"""


class ReadJson(unittest.TestCase):
    def test_json_text_is_read(self):
        self.assertEqual(read_json("package.json", '{"name": "itinera"}'), {"name": "itinera"})

    def test_a_file_that_is_not_json_is_named(self):
        with self.assertRaisesRegex(ValueError, "^package.json cannot be parsed"):
            read_json("package.json", "{")


class PackageOf(unittest.TestCase):
    def test_a_manifest_gives_its_name_and_version(self):
        self.assertEqual(package_of({"name": "itinera", "version": "0.1.0"}), ("itinera", "0.1.0"))

    def test_a_manifest_without_a_version_is_refused(self):
        with self.assertRaisesRegex(ValueError, '"name" and "version"'):
            package_of({"name": "itinera"})


class IsPrerelease(unittest.TestCase):
    def test_a_version_with_a_pre_release_part_is_a_pre_release(self):
        self.assertTrue(is_prerelease("0.1.0-beta.1"))

    def test_build_metadata_alone_is_not_a_pre_release(self):
        self.assertFalse(is_prerelease("0.1.0+build-7"))


class TagProblems(unittest.TestCase):
    def test_the_tag_of_the_version_may_be_released(self):
        self.assertEqual(tag_problems("tag", "v0.1.0", "0.1.0"), [])

    def test_a_branch_cannot_request_a_release(self):
        self.assertIn("not a branch", tag_problems("branch", "main", "0.1.0")[0])

    def test_a_tag_of_another_version_is_refused(self):
        self.assertIn('must be "v0.1.0"', tag_problems("tag", "v0.2.0", "0.1.0")[0])


class LockProblems(unittest.TestCase):
    def test_a_lock_recording_the_version_passes(self):
        lock = {"packages": {"packages/itinera": {"version": "0.1.0"}}}
        self.assertEqual(lock_problems(lock, "packages/itinera", "0.1.0"), [])

    def test_a_lock_recording_another_version_is_refused(self):
        lock = {"packages": {"packages/itinera": {"version": "0.0.0"}}}
        self.assertIn("records 0.0.0", lock_problems(lock, "packages/itinera", "0.1.0")[0])

    def test_a_lock_without_the_package_is_refused(self):
        self.assertIn("records no version", lock_problems({}, "packages/itinera", "0.1.0")[0])


class DistTagProblems(unittest.TestCase):
    def test_a_pre_release_under_next_passes(self):
        self.assertEqual(dist_tag_problems({"publishConfig": {"tag": "next"}}, "0.1.0-beta.1"), [])

    def test_a_pre_release_without_a_dist_tag_is_refused(self):
        self.assertIn('must be "next", not null', dist_tag_problems({}, "0.1.0-beta.1")[0])

    def test_a_release_without_a_dist_tag_passes(self):
        self.assertEqual(dist_tag_problems({}, "0.1.0"), [])

    def test_a_release_under_latest_passes(self):
        self.assertEqual(dist_tag_problems({"publishConfig": {"tag": "latest"}}, "0.1.0"), [])

    def test_a_release_under_next_is_refused(self):
        self.assertIn("must be removed", dist_tag_problems({"publishConfig": {"tag": "next"}}, "0.1.0")[0])


class OnBranch(unittest.TestCase):
    def test_the_comparison_runs_from_the_commit_to_the_branch(self):
        self.assertEqual(compare_path("o/r", "abc", "main"), "/repos/o/r/compare/abc...main?per_page=1")

    def test_a_branch_ahead_of_the_commit_or_at_it_contains_it(self):
        self.assertTrue(on_branch("ahead") and on_branch("identical"))

    def test_a_branch_that_diverged_does_not_contain_the_commit(self):
        self.assertFalse(on_branch("diverged") or on_branch("behind"))


class ChangelogSection(unittest.TestCase):
    def test_a_section_ends_at_the_next_heading(self):
        self.assertEqual(changelog_section(CHANGELOG, "0.1.0-beta.2"), "The second beta.\n\n### Added\n\n- Everything.")

    def test_the_last_section_ends_at_the_link_definitions(self):
        self.assertEqual(changelog_section(CHANGELOG, "0.0.1"), "- A placeholder.")

    def test_an_empty_section_has_no_notes(self):
        self.assertIsNone(changelog_section(CHANGELOG, "0.1.0-beta.1"))

    def test_a_version_without_a_section_has_no_notes(self):
        self.assertIsNone(changelog_section(CHANGELOG, "0.2.0"))


class ConformanceProblems(unittest.TestCase):
    def test_a_manifest_with_cases_and_proposals_passes(self):
        self.assertEqual(conformance_problems({"cases": "v0.1.0", "proposals": [2, 3]}), [])

    def test_a_manifest_that_is_not_an_object_is_refused(self):
        self.assertEqual(conformance_problems([]), ["conformance.json must hold an object."])

    def test_a_manifest_without_cases_is_refused(self):
        self.assertIn('"cases"', conformance_problems({"proposals": []})[0])

    def test_proposals_that_are_not_numbers_are_refused(self):
        self.assertIn('"proposals"', conformance_problems({"cases": "v0.1.0", "proposals": ["0002"]})[0])


class TierProblems(unittest.TestCase):
    def test_every_proposal_listed_passes(self):
        self.assertEqual(tier_problems({2, 3}, [2, 3, 200], 1), [])

    def test_each_proposal_not_listed_is_named(self):
        self.assertEqual(
            tier_problems({2, 3}, [2], 1), ["Proposal 0003, of tier 1 or below, is not listed in conformance.json."]
        )

    def test_cases_without_a_proposal_of_the_tiers_are_refused(self):
        self.assertEqual(tier_problems(set(), [2], 1), ["The cases hold no proposal of tiers 1 to 1."])
