"""Run the TypeScript book at the commit this repository pins, against this repository's own itinera package."""

import json
import os
import pathlib
import shlex
import subprocess
import sys
import tarfile
import tempfile
from typing import NoReturn

from lib.book import extract, pinned_commit
from lib.http import GitHub, RequestError


def fail(message) -> NoReturn:
    print(f"::error::{message}")
    sys.exit(1)


def main():
    env = os.environ
    owner = env["REPO"].split("/")[0]
    book_repo = env.get("BOOK_REPO") or f"{owner}/book"
    try:
        commit = pinned_commit(json.loads(pathlib.Path(env["PIN"]).read_text(encoding="utf-8")))
    except (OSError, ValueError) as error:
        fail(f"{env['PIN']} cannot be read: {error}")

    work = tempfile.mkdtemp(dir=env.get("RUNNER_TEMP"))
    try:
        root = extract(GitHub(env["GH_TOKEN"]).download(f"/repos/{book_repo}/tarball/{commit}"), work)
    except (RequestError, tarfile.TarError, ValueError) as error:
        fail(f"The book at {book_repo}@{commit} cannot be downloaded: {error}")
    book = root / env["BOOK_DIR"]

    # The book's `npm run itinera` packs the checkout ITINERA_TS names instead of the commit the book pins, and
    # `npm install`, rather than `npm ci`, accepts this repository's dependencies where they differ from the book's
    # lockfile.
    npm_env = {name: value for name, value in env.items() if name != "GH_TOKEN"} | {"ITINERA_TS": os.getcwd()}
    print(f"Running the book {book_repo}@{commit} against {env['REPO']} as it stands.", flush=True)
    commands = (["npm", "run", "itinera"], ["npm", "install", "--no-audit", "--no-fund"], shlex.split(env["COMMAND"]))
    for command in commands:
        returncode = subprocess.run(command, cwd=book, env=npm_env).returncode
        if returncode != 0:
            fail(f"{shlex.join(command)} failed in the book's {env['BOOK_DIR']}; its output is above.")


if __name__ == "__main__":
    main()
