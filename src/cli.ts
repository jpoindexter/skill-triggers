#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { parseSkill } from "./frontmatter.js";
import { compileToVanta, compileToClaude } from "./compiler.js";
import { mergeVanta, mergeClaude } from "./upsert.js";
import type { Target } from "./types.js";

// `skill-triggers compile <skill-dir|skill.md> --target vanta|claude [--write]`
// Reads a SKILL.md, compiles its triggers, and prints (or, with --write, merges
// into) the target harness config.

const USAGE = `Usage: skill-triggers compile <skill-dir|SKILL.md> --target vanta|claude [--write] [--bin <path>]
  --target vanta   compile to a Vanta hooks.json fragment (default ~/.vanta/hooks.json)
  --target claude  compile to a Claude Code settings.json fragment (default ~/.claude/settings.json)
  --write          merge into the target config file (idempotent, preserves hand-written hooks)
  --bin <path>     the agent binary the hook runs (default "vanta")`;

function readSkill(path: string): string {
  const file = path.endsWith(".md") ? path : join(path, "SKILL.md");
  if (!existsSync(file)) throw new Error(`no SKILL.md at ${file}`);
  return readFileSync(file, "utf8");
}

function readJson(path: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(readFileSync(path, "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeJson(path: string, obj: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export function run(argv: string[]): number {
  const [cmd, src, ...rest] = argv;
  if (cmd !== "compile" || !src) {
    console.log(USAGE);
    return cmd === "compile" ? 1 : 0;
  }
  const target = flag(rest, "--target") as Target | undefined;
  if (target !== "vanta" && target !== "claude") {
    console.error("error: --target must be vanta or claude");
    return 1;
  }
  const bin = flag(rest, "--bin") ?? "vanta";
  const write = rest.includes("--write");
  const skill = parseSkill(readSkill(src));

  if (target === "vanta") {
    const compiled = compileToVanta(skill, bin);
    const path = join(homedir(), ".vanta", "hooks.json");
    const merged = mergeVanta(write ? readJson(path) : {}, compiled);
    if (write) writeJson(path, merged), console.log(`✓ wrote ${compiled.length} hook(s) → ${path}`);
    else console.log(JSON.stringify(merged, null, 2));
  } else {
    const compiled = compileToClaude(skill, bin);
    const path = join(homedir(), ".claude", "settings.json");
    const merged = mergeClaude(write ? readJson(path) : {}, compiled);
    if (write) writeJson(path, merged), console.log(`✓ wrote ${compiled.length} hook(s) → ${path}`);
    else console.log(JSON.stringify(merged, null, 2));
  }
  return 0;
}

// Run when invoked as a CLI (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) process.exit(run(process.argv.slice(2)));
