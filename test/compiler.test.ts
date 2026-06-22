import { describe, it, expect } from "vitest";
import { compileToVanta, compileToClaude, buildTriggerNote, slugify, TRIGGER_MARKER } from "../src/compiler.js";
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
  it("supports Stop + UserPromptSubmit only", () => {
    const out = compileToClaude(skill([{ event: "Stop" }, { event: "PreToolUse", match: "git_push" }]));
    expect(out.map((e) => e.event)).toEqual(["Stop"]);
    expect(out[0]!.command).toMatch(/2>\/dev\/null$/);
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
