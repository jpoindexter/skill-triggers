import { TRIGGER_MARKER, type ClaudeEntry, type VantaHook } from "./compiler.js";

// Idempotent, namespaced merges. Generated entries are identified by the
// TRIGGER_MARKER in their command, so re-running replaces them cleanly and never
// touches hand-written hooks. Pure object transforms — no I/O.

const cmdOf = (h: unknown): string => (h && typeof h === "object" ? String((h as { command?: unknown }).command ?? "") : "");

/** Merge compiled Vanta hooks into a hooks.json object. Drops prior generated
 *  entries, keeps hand-written ones, adds current. Tolerant of non-array values. */
export function mergeVanta(
  existing: Record<string, unknown>,
  compiled: { event: string; hook: VantaHook }[],
): Record<string, VantaHook[]> {
  const out: Record<string, VantaHook[]> = {};
  for (const [event, val] of Object.entries(existing)) {
    if (!Array.isArray(val)) continue;
    const kept = (val as VantaHook[]).filter((h) => !cmdOf(h).includes(TRIGGER_MARKER));
    if (kept.length) out[event] = kept;
  }
  for (const { event, hook } of compiled) (out[event] ??= []).push(hook);
  return out;
}

type ClaudeHookGroup = { matcher?: string; hooks?: unknown[] };

/** Merge compiled Claude entries into a settings.json object. Same namespaced,
 *  idempotent semantics; preserves the user's hand-written Claude hooks. */
export function mergeClaude(
  settings: Record<string, unknown>,
  compiled: ClaudeEntry[],
): Record<string, unknown> {
  const src = (settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {}) as Record<string, unknown>;
  const hooks: Record<string, ClaudeHookGroup[]> = {};
  for (const [event, val] of Object.entries(src)) {
    if (!Array.isArray(val)) continue;
    const kept = (val as ClaudeHookGroup[]).filter((e) => !(e.hooks ?? []).some((h) => cmdOf(h).includes(TRIGGER_MARKER)));
    if (kept.length) hooks[event] = kept;
  }
  for (const c of compiled) (hooks[c.event] ??= []).push({ matcher: c.matcher, hooks: [{ type: "command", command: c.command }] });
  return { ...settings, hooks };
}
