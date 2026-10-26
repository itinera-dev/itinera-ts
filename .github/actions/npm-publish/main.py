"""Publish a workspace package's version to npm, unless that version is there already."""

import os
import pathlib
import subprocess
import sys

from lib.http import RequestError, npm_versions
from lib.release import package_of, read_json


def main():
    directory = os.environ["PACKAGE"].rstrip("/")
    path = f"{directory}/package.json"
    try:
        name, version = package_of(read_json(path, pathlib.Path(path).read_text(encoding="utf-8")))
        published = version in npm_versions(name)
    except (OSError, ValueError, RequestError) as error:
        print(f"::error::{error}")
        sys.exit(1)
    if published:
        print(f"::notice::{name} {version} is on npm already; nothing is published.")
        return
    sys.exit(subprocess.run(["npm", "publish", "--workspace", directory], check=False).returncode)


if __name__ == "__main__":
    main()
