# skill-triggers

**Declarative event-fired triggers for agent skills.** Most agent "skills" (a `SKILL.md`
file of reusable know-how) only fire by *relevance* — the agent recalls them when a task
looks related. `skill-triggers` lets a skill declare it should fire on a specific **harness
event** (before a push, after repeated tool errors, on a prompt) by adding one frontmatter
field, then compiles that into hooks for **[Vanta](https://github.com/jpoindexter/Vanta)**
and **Claude Code**.

```yaml
---
name: ship-preflight
description: Run the test suite before a push
triggers: [{"event":"PreToolUse","match":"git_push"}]
---
```

## The `triggers:` convention

A single-line JSON array on a `triggers:` key. Each entry:

| Field | Meaning |
|---|---|
| `event` | Harness event (e.g. `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit`) |
| `match` | (optional) regex on the tool name — `PreToolUse`/`PostToolUse` |
| `when` | (optional) compact condition; `"errors>=N"` fires on a tool error |
| `action` | (optional) `"block"` makes a `PreToolUse` trigger a hard gate; default is advisory |
| `note` | (optional) override the surfaced recall note |

Single-line keeps it parseable by the flat frontmatter readers both harnesses use.

## Firing model — safe by design

A trigger never *runs* the skill body or anything irreversible. It compiles to a hook that
runs `vanta skills trigger-emit <slug> <event>`, which only **surfaces a recall note** so the
agent applies the know-how itself:

- **`Stop`** → prints `{"additionalContext": "…recall skill X…"}` to stdout (model-facing injection).
- **`PreToolUse`** → a heads-up to the user (advisory). With `action:"block"` it can hard-gate the tool.
- **`UserPromptSubmit` / others** → prints the note to stdout (Claude Code injects it as context).

## Which events inject context

| Harness | Real context injection on |
|---|---|
| **Vanta** | `Stop` (`additionalContext`); `PreToolUse` can block/advise; `PostToolUse` on error |
| **Claude Code** | `PreToolUse` (`hookSpecificOutput.additionalContext`), `UserPromptSubmit`, `Stop` |

The compiler degrades unsupported events to advisory rather than failing.

### Cross-harness tool names

Claude Code's tool names differ from Vanta's (a git push is a `Bash` call, not a `git_push`
tool). The compiler maps `match` accordingly — `git_push` → matcher `Bash` + the emitter
confirms the command contains `git push` before firing — so a `PreToolUse` trigger behaves the
same in both harnesses, with no every-call noise. (`write_file`→`Write|Edit`, `read_file`→`Read`, …;
unknown names pass through unchanged.)

## Use it

```bash
# Print the Vanta hooks.json fragment for a skill
npx skill-triggers compile ./my-skill --target vanta

# Merge it into ~/.vanta/hooks.json (idempotent; preserves hand-written hooks)
npx skill-triggers compile ./my-skill --target vanta --write

# Or target Claude Code's ~/.claude/settings.json (Stop + UserPromptSubmit)
npx skill-triggers compile ./my-skill --target claude --write
```

Re-running is idempotent: generated entries are namespaced by the `skills trigger-emit`
command marker, so they're cleanly replaced and your hand-written hooks are never touched.

## Library

```ts
import { parseSkill, compileToVanta, compileToClaude, mergeVanta } from "skill-triggers";

const skill = parseSkill(readFileSync("SKILL.md", "utf8"));
const hooks = compileToVanta(skill);            // → [{ event, hook }]
const merged = mergeVanta(existingHooksJson, hooks);
```

## Status

v0.1 — the convention + reference compiler + CLI, with cross-harness `PreToolUse` tool mapping
for Vanta and Claude Code. The compiler is the reference implementation of the `triggers:`
convention; Vanta ships a native integration of the same logic. Roadmap: an `agent`-mode firing
option (run a skill as a worker), `PostToolUse` support on Claude, and an npm release Vanta
consumes directly.

## License

MIT
