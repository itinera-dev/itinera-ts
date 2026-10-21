"""Ask the organisation's site to build and deploy again."""

import os
import sys
from typing import NoReturn

from lib.http import GitHub, RequestError
from lib.site import dispatch, without_token_problems


def fail(problems) -> NoReturn:
    print("The site was not asked to deploy:")
    for problem in problems:
        print(f"::error::{problem}")
    sys.exit(1)


def main():
    env = os.environ
    site, event, choice = env["SITE"], env["EVENT"], env["WITHOUT_TOKEN"]
    problems = without_token_problems(choice)
    if problems:
        fail(problems)
    if not env["GH_TOKEN"]:
        if choice == "skip":
            print(f"::warning::No token can reach {site}, so it was not asked to deploy.")
            return
        fail([f"No token can reach {site}: the secret the workflow passes as the input \"token\" is not set."])
    try:
        GitHub(env["GH_TOKEN"]).post(
            f"/repos/{site}/dispatches", dispatch(event, env["REPO"], env["REF_NAME"], env["SHA"])
        )
    except RequestError as error:
        fail([str(error)])
    print(f"Asked {site} to deploy, for {env['REPO']} at {env['REF_NAME']}.")


if __name__ == "__main__":
    main()
