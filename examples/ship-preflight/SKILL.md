---
name: ship-preflight
description: Pre-deploy gate — typecheck, full test suite, build; any red stops the push
tags: [deploy, ship, gate]
triggers: [{"event":"PreToolUse","match":"git_push"}]
---

# Ship preflight

Before a push, run in order and stop on the first red:

1. `typecheck` — must exit 0.
2. Full test suite — all pass.
3. Build — must succeed.

Green = print the deploy command, never run it. Red = report which gate failed.
