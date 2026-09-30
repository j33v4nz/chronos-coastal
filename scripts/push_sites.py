"""Push a checkpoint using a short-lived credential supplied over stdin.

The token is kept in process memory, never written to source/config/credential
files or passed as a command-line argument.
"""
import json
import os
import subprocess
import sys

credential = json.loads(sys.stdin.readline())
remote = credential["remote_url"]
if not remote.startswith("https://") or credential["auth_mode"] != "http_extra_header":
    raise SystemExit("Unsupported source credential")
env = os.environ.copy()
env.update(GIT_TERMINAL_PROMPT="0", GIT_CONFIG_COUNT="1",
           GIT_CONFIG_KEY_0=f"http.{remote}.extraHeader",
           GIT_CONFIG_VALUE_0="Authorization: Bearer " + credential["token"])
result = subprocess.run(["git", "push", remote, "HEAD:" + credential["branch"]], env=env)
raise SystemExit(result.returncode)
