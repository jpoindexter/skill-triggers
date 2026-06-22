import type { ParsedSkill } from "./types.js";

// The reference compiler: a skill's `triggers` → hook entries for Vanta
// (`hooks.json`) and Claude Code (`settings.json`). PURE. Firing is Rule-Zero-safe:
// every generated hook runs `vanta skills trigger-emit <slug> <event>`, which only
// SURFACES a recall note — it never runs the skill body or anything irreversible.

/** Substring every generated command carries, so an upsert finds/replaces only
 *  generated entries and never touches hand-written hooks. */
export const TRIGGER_MARKER = "skills trigger-emit";

/** The harness event vocabulary the compiler recognises (Vanta's 30 + the common
 *  Claude Code subset). Unknown events are skipped. */
export const KNOWN_EVENTS: readonly string[] = [
  "SessionStart", "Setup", "InstructionsLoaded", "UserPromptSubmit", "UserPromptExpansion",
  "MessageDisplay", "PreToolUse", "PermissionRequest", "PermissionDenied", "PostToolUse",
  "PostToolUseFailure", "PostToolBatch", "Notification", "SubagentStart", "SubagentStop",
  "TaskCreated", "TaskCompleted", "Stop", "StopFailure", "TeammateIdle", "ConfigChange",
  "CwdChanged", "FileChanged", "WorktreeCreate", "WorktreeRemove", "PreCompact", "PostCompact",
  "SessionEnd", "Elicitation", "ElicitationResult",
];
const KNOWN = new Set(KNOWN_EVENTS);

/** Claude Code v1 injects context only on these events. */
const CLAUDE_EVENTS = new Set(["Stop", "UserPromptSubmit"]);

/** Slugify a skill name into a directory/id-safe token. */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The emit command a trigger hook runs. */
export function emitCommand(slug: string, event: string, bin = "vanta"): string {
  return `${bin} skills trigger-emit ${slug} ${event}`;
}

/** The recall note the emitter surfaces so the model applies the skill's know-how. */
export function buildTriggerNote(skill: ParsedSkill, event: string): string {
  return `🎯 Trigger (${event}): recall and apply skill "${skill.meta.name}" — ${skill.meta.description}`;
}

export type VantaHook = {
  type: "command";
  command: string;
  statusMessage?: string;
  toolNamePattern?: string;
  onError?: boolean;
};

/** Compile a skill's triggers into Vanta hook entries (grouped by event). Pure. */
export function compileToVanta(skill: ParsedSkill, bin = "vanta"): { event: string; hook: VantaHook }[] {
  const slug = slugify(skill.meta.name);
  const out: { event: string; hook: VantaHook }[] = [];
  for (const t of skill.meta.triggers ?? []) {
    if (!KNOWN.has(t.event)) continue;
    const hook: VantaHook = {
      type: "command",
      command: emitCommand(slug, t.event, bin),
      statusMessage: `🎯 ${skill.meta.name}${t.note ? `: ${t.note}` : ` (recall on ${t.event})`}`,
      ...(t.match ? { toolNamePattern: t.match } : {}),
      ...(/error/i.test(t.when ?? "") ? { onError: true } : {}),
    };
    out.push({ event: t.event, hook });
  }
  return out;
}

export type ClaudeEntry = { event: string; matcher: string; command: string };

/** Compile a skill's triggers into Claude Code settings.json entries
 *  (Stop + UserPromptSubmit only in v1). Pure. */
export function compileToClaude(skill: ParsedSkill, bin = "vanta"): ClaudeEntry[] {
  const slug = slugify(skill.meta.name);
  const seen = new Set<string>();
  const out: ClaudeEntry[] = [];
  for (const t of skill.meta.triggers ?? []) {
    if (!CLAUDE_EVENTS.has(t.event) || seen.has(t.event)) continue;
    seen.add(t.event);
    out.push({ event: t.event, matcher: "", command: `${emitCommand(slug, t.event, bin)} 2>/dev/null` });
  }
  return out;
}
