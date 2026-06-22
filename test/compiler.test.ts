import { describe, it, expect } from "vitest";
import { compileToVanta, compileToClaude, claudeToolMap, buildTriggerNote, slugify, TRIGGER_MARKER } from "../src/compiler.js";
import type { ParsedSkill } from "../src/types.js";

const skill = (triggers: ParsedSkill["meta"]["triggers"], name = "ship-preflight"): ParsedSkill => ({
  meta: { name, description: "run the suite before a push", tags: [], triggers },
  body: "...",
});

describe("compileToVanta", () => {
  it("maps match→toolNamePattern, marks the command, sets a status", () => {
    const [e] = compileToVanta(skill([{ event: "PreToolUse", match: "git_push" }]));
    expect(e!.event).toBe("PreToolUse");
    expect(e!.hook.toolNamePattern).toBe("git_push");
    expect(e!.hook.command).toContain(TRIGGER_MARKER);
    expect(e!.hook.command).toContain("ship-preflight PreToolUse");
    expect(e!.hook.statusMessage).toContain("ship-preflight");
  });

  it("maps when:errors→onError and skips unknown events", () => {
    expect(compileToVanta(skill([{ event: "PostToolUse", when: "errors>=3" }]))[0]!.hook.onError).toBe(true);
    expect(compileToVanta(skill([{ event: "Nope" }]))).toEqual([]);
  });
});

describe("compileToClaude", () => {
  it("maps a PreToolUse git_push trigger to a Bash matcher (+ --claude emitter)", () => {
    const out = compileToClaude(skill([{ event: "Stop" }, { event: "PreToolUse", match: "git_push" }]));
    expect(out.map((e) => e.event).sort()).toEqual(["PreToolUse", "Stop"]);
    const pre = out.find((e) => e.event === "PreToolUse")!;
    expect(pre.matcher).toBe("Bash");
    expect(pre.command).toContain("--claude");
  });

  it("maps a PostToolUse+error trigger to PostToolUseFailure", () => {
    const out = compileToClaude(skill([{ event: "PostToolUse", when: "errors>=3" }]));
    expect(out).toHaveLength(1);
    expect(out[0]!.event).toBe("PostToolUseFailure");
    expect(out[0]!.command).toContain("PostToolUseFailure --claude");
  });
});

describe("claudeToolMap", () => {
  it("maps known tools and falls back to the raw match", () => {
    expect(claudeToolMap("git_push")).toEqual({ matcher: "Bash", inputContains: "git push" });
    expect(claudeToolMap("Custom")).toEqual({ matcher: "Custom" });
    expect(claudeToolMap(undefined)).toEqual({ matcher: "" });
  });
});

describe("helpers", () => {
  it("slugify is id-safe", () => {
    expect(slugify("Ship Preflight!")).toBe("ship-preflight");
  });
  it("buildTriggerNote names the skill, no query echo", () => {
    const note = buildTriggerNote(skill([]), "Stop");
    expect(note).toContain("ship-preflight");
    expect(note).not.toMatch(/query/i);
  });
});
