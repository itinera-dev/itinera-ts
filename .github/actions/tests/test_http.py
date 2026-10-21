import io
import json
import tarfile
import tempfile
import unittest
import urllib.error
from unittest import mock

from lib.http import GitHub, RequestError, npm_versions


class Answer(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def answering(body):
    return mock.patch("urllib.request.urlopen", return_value=Answer(body))


def tarball(files):
    """A gzipped tarball holding `files`, each name relative to one top folder, as GitHub serves a repository."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for name, text in files.items():
            data = text.encode()
            member = tarfile.TarInfo(f"o-r-0123456/{name}")
            member.size = len(data)
            tar.addfile(member, io.BytesIO(data))
    return buffer.getvalue()


def failing(code):
    error = urllib.error.HTTPError("https://example.org", code, "failed", {}, io.BytesIO(b"why"))
    return mock.patch("urllib.request.urlopen", side_effect=error)


class NpmVersions(unittest.TestCase):
    def test_a_package_gives_every_version_it_has(self):
        with answering(json.dumps({"versions": {"0.1.0-beta.1": {}, "0.1.0": {}}}).encode()):
            self.assertEqual(npm_versions("itinera"), {"0.1.0-beta.1", "0.1.0"})

    def test_a_package_that_does_not_exist_has_no_version(self):
        with failing(404):
            self.assertEqual(npm_versions("itinera"), set())

    def test_any_other_failure_is_an_error(self):
        with failing(500), self.assertRaisesRegex(RequestError, "failed with 500: why"):
            npm_versions("itinera")


class GitHubGet(unittest.TestCase):
    def test_nothing_there_is_none(self):
        with failing(404):
            self.assertIsNone(GitHub("token").get("/repos/o/r/compare/a...main"))

    def test_json_is_read(self):
        with answering(b'{"status": "ahead"}'):
            self.assertEqual(GitHub("token").get("/repos/o/r/compare/a...main"), {"status": "ahead"})


class GitHubPost(unittest.TestCase):
    def test_an_empty_answer_is_success(self):
        with answering(b""):
            GitHub("token").post("/repos/o/site/dispatches", {"event_type": "api-reference"})

    def test_nothing_there_is_an_error(self):
        with failing(404), self.assertRaisesRegex(RequestError, "found nothing"):
            GitHub("token").post("/repos/o/site/dispatches", {"event_type": "api-reference"})


class GitHubExtractRepository(unittest.TestCase):
    def test_the_root_is_the_tarballs_top_folder(self):
        with tempfile.TemporaryDirectory() as into, answering(tarball({"typescript/package.json": "{}"})):
            root = GitHub("token").extract_repository("o/r", "0123456", into)
            self.assertEqual(root.name, "o-r-0123456")
            self.assertEqual((root / "typescript" / "package.json").read_text(), "{}")

    def test_a_member_outside_the_folder_is_refused(self):
        archive = tarball({"../../outside": ""})
        with tempfile.TemporaryDirectory() as into, answering(archive):
            with self.assertRaisesRegex(RequestError, "cannot be extracted"):
                GitHub("token").extract_repository("o/r", "0123456", into)

    def test_nothing_there_is_an_error(self):
        with tempfile.TemporaryDirectory() as into, failing(404):
            with self.assertRaisesRegex(RequestError, "found nothing"):
                GitHub("token").extract_repository("o/r", "0123456", into)
