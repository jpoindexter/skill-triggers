// skill-triggers — portable types. A "skill" is a SKILL.md with YAML-ish
// frontmatter; a `triggers:` field declares the harness events that should
// auto-surface it. No runtime dependencies.

/** One declarative firing trigger. An unknown `event` parses fine but is skipped
 *  by the compiler (forward-compatible). */
export type SkillTrigger = {
  /** Harness event name (e.g. PreToolUse, Stop, UserPromptSubmit). */
  event: string;
  /** PreToolUse/PostToolUse: regex on the tool name. */
  match?: string;
  /** Compact condition; "errors>=N" maps to an error matcher. */
  when?: string;
  /** PreToolUse firing mode. "block" = hard gate; default advisory. */
  action?: "advisory" | "block";
  /** Override the default recall-note text. */
  note?: string;
};

/** The frontmatter fields skill-triggers cares about (others are ignored). */
export type SkillMeta = {
  name: string;
  description: string;
  tags: string[];
  triggers?: SkillTrigger[];
};

export type ParsedSkill = { meta: SkillMeta; body: string };

export type Target = "vanta" | "claude";
