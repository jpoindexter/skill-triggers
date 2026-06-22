import { describe, it, expect } from "vitest";
import { compileToVanta, compileToClaude } from "../src/compiler.js";
import { mergeVanta, mergeClaude } from "../src/upsert.js";
import type { ParsedSkill } from "../src/types.js";

const skill: ParsedSkill = {
  meta: { name: "ship-preflight", description: "d", tags: [], triggers: [{ event: "Stop" }] },
  body: "...",
};

describe("mergeVanta", () => {
  const compiled = compileToVanta(skill);

  it("keeps hand-written hooks and adds generated", () => {
    const merged = mergeVanta({ Stop: [{ type: "command", command: "echo hand" }] }, compiled);
    expect(merged.Stop).toHaveLength(2);
    expect(merged.Stop!.some((h) => h.command === "echo hand")).toBe(true);
  });

  it("is idempotent — re-merge replaces generated, no duplicates", () => {
    const once = mergeVanta({ Stop: [{ type: "command", command: "echo hand" }] }, compiled);
    expect(mergeVanta(once, compiled).Stop).toHaveLength(2);
  });

  it("re-merge with no triggers drops only the generated entry", () => {
    const once = mergeVanta({ Stop: [{ type: "command", command: "echo hand" }] }, compiled);
    expect(mergeVanta(once, []).Stop).toEqual([{ type: "command", command: "echo hand" }]);
  });
});

describe("mergeClaude", () => {
  const compiled = compileToClaude(skill);

  it("preserves the user's Claude hooks and is idempotent", () => {
    const settings = { hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: "node mine.js" }] }] } };
    const once = mergeClaude(settings, compiled) as { hooks: Record<string, unknown[]> };
    expect(once.hooks.Stop).toHaveLength(2);
    const twice = mergeClaude(once, compiled) as { hooks: Record<string, unknown[]> };
    expect(twice.hooks.Stop).toHaveLength(2);
  });
});
