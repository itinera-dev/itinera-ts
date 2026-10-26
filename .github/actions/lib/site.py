"""Asking the organisation's site to deploy again."""


def dispatch(event, repo, ref, sha):
    """The repository_dispatch request saying which repository asks, and at which ref and commit."""
    return {"event_type": event, "client_payload": {"repository": repo, "ref": ref, "sha": sha}}


def without_token_problems(choice):
    """Why `choice` is not a value of the input "without-token"."""
    if choice not in ("fail", "skip"):
        return [f'The input "without-token" must be "fail" or "skip", not "{choice}".']
    return []
