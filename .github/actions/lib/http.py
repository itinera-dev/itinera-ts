"""Requests to GitHub's REST API and to the npm registry, over urllib."""

import io
import json
import os
import pathlib
import tarfile
import urllib.error
import urllib.request

GITHUB_API_URL = os.environ.get("GITHUB_API_URL", "https://api.github.com")
NPM_REGISTRY_URL = "https://registry.npmjs.org"


class RequestError(Exception):
    pass


def _send(request):
    """The body of the answer to `request`, or None when it is 404, which callers read as "there is none"."""
    try:
        with urllib.request.urlopen(request) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        failure = f"{request.get_method()} {request.full_url} failed with {error.code}: {error.read().decode()}"
        raise RequestError(failure) from error
    except urllib.error.URLError as error:
        raise RequestError(f"{request.get_method()} {request.full_url} failed: {error.reason}") from error


class GitHub:
    def __init__(self, token, api_url=GITHUB_API_URL):
        self._token = token
        self._api_url = api_url

    def _request(self, method, path, body=None):
        request = urllib.request.Request(
            self._api_url + path,
            data=None if body is None else json.dumps(body).encode(),
            method=method,
            headers={
                "Authorization": f"Bearer {self._token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        return _send(request)

    def get(self, path):
        """The JSON at `path`, or None when GitHub has nothing there."""
        answer = self._request("GET", path)
        return None if answer is None else json.loads(answer)

    def download(self, path):
        """The raw bytes at `path`, following redirects, such as a repository tarball."""
        answer = self._request("GET", path)
        if answer is None:
            raise RequestError(f"GET {self._api_url}{path} found nothing.")
        return answer

    def extract_repository(self, repo, ref, into):
        """Extract `repo` at `ref` into the folder `into`, returning the repository's root folder inside it."""
        archive = self.download(f"/repos/{repo}/tarball/{ref}")
        try:
            with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
                tar.extractall(into, filter="data")
        except tarfile.TarError as error:
            raise RequestError(f"The tarball of {repo}@{ref} cannot be extracted: {error}") from error
        roots = list(pathlib.Path(into).iterdir())
        if len(roots) != 1:
            raise RequestError(f"The tarball of {repo}@{ref} has no single top folder.")
        return roots[0]

    def post(self, path, body):
        """Send `body` as JSON to `path`; fails when GitHub has nothing there."""
        if self._request("POST", path, body) is None:
            raise RequestError(f"POST {self._api_url}{path} found nothing, or the token may not see it.")


def npm_versions(package, registry_url=NPM_REGISTRY_URL):
    """Every version of `package` on the npm registry, empty when the package does not exist yet."""
    request = urllib.request.Request(
        f"{registry_url}/{package}", headers={"Accept": "application/vnd.npm.install-v1+json"}
    )
    answer = _send(request)
    return set() if answer is None else set(json.loads(answer).get("versions", {}))
