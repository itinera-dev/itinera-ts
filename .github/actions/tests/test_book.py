import io
import tarfile
import tempfile
import unittest

from lib.book import extract, pinned_commit

COMMIT = "0123456789abcdef0123456789abcdef01234567"


def tarball(files):
    """A gzipped tarball holding `files` under one top directory, as GitHub serves a repository."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for name, text in files.items():
            data = text.encode()
            member = tarfile.TarInfo(f"itinera-dev-book-0123456/{name}")
            member.size = len(data)
            tar.addfile(member, io.BytesIO(data))
    return buffer.getvalue()


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


class Extract(unittest.TestCase):
    def test_the_root_is_the_tarballs_top_directory(self):
        with tempfile.TemporaryDirectory() as into:
            root = extract(tarball({"typescript/package.json": "{}"}), into)
            self.assertEqual(root.name, "itinera-dev-book-0123456")
            self.assertEqual((root / "typescript" / "package.json").read_text(), "{}")

    def test_a_member_outside_the_directory_is_refused(self):
        with tempfile.TemporaryDirectory() as into, self.assertRaises(tarfile.TarError):
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
                member = tarfile.TarInfo("../outside")
                tar.addfile(member, io.BytesIO(b""))
            extract(buffer.getvalue(), into)
