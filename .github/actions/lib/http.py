"""Requests to GitHub's REST API, over urllib."""

import json
import os
import urllib.error
import urllib.request

GITHUB_API_URL = os.environ.get("GITHUB_API_URL", "https://api.github.com")


class RequestError(Exception):
    pass


class GitHub:
    def __init__(self, token, api_url=GITHUB_API_URL):
        self._token = token
        self._api_url = api_url

    def post(self, path, body):
        """Send `body` as JSON to `path`; fails when GitHub has nothing there, or answers with any other error."""
        url = self._api_url + path
        request = urllib.request.Request(
            url,
            data=json.dumps(body).encode(),
            method="POST",
            headers={
                "Authorization": f"Bearer {self._token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urllib.request.urlopen(request):
                return
        except urllib.error.HTTPError as error:
            if error.code == 404:
                raise RequestError(f"POST {url} found nothing, or the token may not see it.") from error
            raise RequestError(f"POST {url} failed with {error.code}: {error.read().decode()}") from error
        except urllib.error.URLError as error:
            raise RequestError(f"POST {url} failed: {error.reason}") from error

