---
name: systematic-debugging
description: 4-phase root-cause debugging — understand the bug before fixing it
tags: [debug, root-cause]
triggers: [{"event":"PostToolUse","when":"errors>=3"}]
---

# Systematic debugging

When tool calls keep failing, stop guessing and work the phases:

1. **Reproduce** — get the failure to happen reliably.
2. **Isolate** — bisect to the smallest failing input.
3. **Understand** — find the root cause, not a symptom.
4. **Fix + lock** — fix the cause, add a regression test.
