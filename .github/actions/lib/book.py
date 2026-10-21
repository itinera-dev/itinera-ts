"""The book's check: the book commit this repository pins, and the book's files at that commit."""

import io
import pathlib
import re
import tarfile

COMMIT = re.compile(r"[0-9a-f]{40}")


def pinned_commit(pin):
    """The book commit that `pin`, the parsed pin file, names.

    Raises ValueError when the pin file is not an object whose "commit" is a full commit SHA.
    """
    commit = pin.get("commit") if isinstance(pin, dict) else None
    if not isinstance(commit, str) or not COMMIT.fullmatch(commit):
        raise ValueError('The pin file must hold an object whose "commit" is a full 40-character commit SHA.')
    return commit


def extract(archive, into):
    """Extract `archive`, a repository's tarball as GitHub serves it, into `into`, returning the repository's root."""
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        tar.extractall(into, filter="data")
    (root,) = pathlib.Path(into).iterdir()
    return root
