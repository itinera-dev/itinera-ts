import unittest

from lib.book import pinned_commit

COMMIT = "0123456789abcdef0123456789abcdef01234567"


class PinnedCommit(unittest.TestCase):
    def test_a_full_commit_sha_is_the_pinned_commit(self):
        self.assertEqual(pinned_commit({"commit": COMMIT}), COMMIT)

    def test_anything_else_is_refused(self):
        for name, pin in {
            "a short sha": {"commit": COMMIT[:7]},
            "a branch": {"commit": "next"},
            "an upper case sha": {"commit": COMMIT.upper()},
            "no commit": {},
            "not an object": [COMMIT],
        }.items():
            with self.subTest(name), self.assertRaisesRegex(ValueError, "full 40-character commit SHA"):
                pinned_commit(pin)

