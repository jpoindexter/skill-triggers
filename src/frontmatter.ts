import type { ParsedSkill, SkillMeta, SkillTrigger } from "./types.js";

// Flat, lenient SKILL.md frontmatter parser (portable, zero-dep). Splits each line
// on the FIRST colon, so ISO timestamps and inline JSON survive. `triggers:` is a
// single-line JSON array; `tags:` is `[a, b]` or `a, b`.

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function parseTags(value: string): string[] {
  return value
    .replace(/^\[(.*)\]$/s, "$1")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseTriggers(value: string): SkillTrigger[] {
  try {
    const arr: unknown = JSON.parse(value);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (t): t is SkillTrigger => !!t && typeof t === "object" && typeof (t as { event?: unknown }).event === "string",
    );
  } catch {
    return [];
  }
}

function parseMeta(block: string): SkillMeta {
  const meta: SkillMeta = { name: "", description: "", tags: [] };
  for (const line of block.split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (key === "name") meta.name = stripQuotes(value);
    else if (key === "description") meta.description = stripQuotes(value);
    else if (key === "tags") meta.tags = parseTags(value);
    else if (key === "triggers") meta.triggers = parseTriggers(value);
  }
  return meta;
}

/** Strip a single surrounding pair of double quotes (descriptions are often quoted). */
function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/s, "$1");
}

/** Parse a SKILL.md string into meta + body. With no frontmatter, meta is empty. */
export function parseSkill(md: string): ParsedSkill {
  const match = md.match(FRONTMATTER_RE);
  if (!match) return { meta: { name: "", description: "", tags: [] }, body: md.trim() };
  return { meta: parseMeta(match[1] ?? ""), body: md.slice(match[0].length).trim() };
}
