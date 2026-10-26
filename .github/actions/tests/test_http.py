import io
import unittest
import urllib.error
from unittest import mock

from lib.http import GitHub, RequestError


class Answer(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def answering(body):
    return mock.patch("urllib.request.urlopen", return_value=Answer(body))


def failing(code):
    error = urllib.error.HTTPError("https://example.org", code, "failed", {}, io.BytesIO(b"why"))
    return mock.patch("urllib.request.urlopen", side_effect=error)


class GitHubPost(unittest.TestCase):
    def test_an_empty_answer_is_success(self):
        with answering(b""):
            GitHub("token").post("/repos/o/site/dispatches", {"event_type": "api-reference"})

    def test_nothing_there_is_an_error(self):
        with failing(404), self.assertRaisesRegex(RequestError, "found nothing"):
            GitHub("token").post("/repos/o/site/dispatches", {"event_type": "api-reference"})

    def test_any_other_failure_is_an_error(self):
        with failing(500), self.assertRaisesRegex(RequestError, "failed with 500: why"):
            GitHub("token").post("/repos/o/site/dispatches", {"event_type": "api-reference"})
