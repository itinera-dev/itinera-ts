import unittest

from lib.site import dispatch, without_token_problems


class Dispatch(unittest.TestCase):
    def test_the_request_names_the_repository_its_ref_and_its_commit(self):
        self.assertEqual(
            dispatch("api-reference", "o/r", "v0.1.0", "abc"),
            {"event_type": "api-reference", "client_payload": {"repository": "o/r", "ref": "v0.1.0", "sha": "abc"}},
        )


class WithoutTokenProblems(unittest.TestCase):
    def test_fail_and_skip_are_accepted(self):
        self.assertEqual(without_token_problems("fail") + without_token_problems("skip"), [])

    def test_anything_else_is_refused(self):
        self.assertIn('"fail" or "skip", not "warn"', without_token_problems("warn")[0])
