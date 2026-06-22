import { describe, it, expect } from "vitest";
import { parseSkill } from "../src/frontmatter.js";

describe("parseSkill", () => {
  it("parses name/description/tags/triggers", () => {
    const md = [
      "---",
      "name: ship-preflight",
      'description: "Run the suite before a push"',
      "tags: [deploy, ship]",
      'triggers: [{"event":"PreToolUse","match":"git_push"}]',
      "---",
      "",
      "# Body",
    ].join("\n");
    const s = parseSkill(md);
    expect(s.meta.name).toBe("ship-preflight");
    expect(s.meta.description).toBe("Run the suite before a push");
    expect(s.meta.tags).toEqual(["deploy", "ship"]);
    expect(s.meta.triggers).toEqual([{ event: "PreToolUse", match: "git_push" }]);
    expect(s.body).toBe("# Body");
  });

  it("is lenient: malformed triggers JSON → [], other keys still parse", () => {
    const s = parseSkill("---\nname: x\ndescription: d\ntags: [a]\ntriggers: nope\n---\n\nb");
    expect(s.meta.triggers).toEqual([]);
    expect(s.meta.tags).toEqual(["a"]);
  });

  it("treats a file with no frontmatter as all-body", () => {
    expect(parseSkill("just text").body).toBe("just text");
  });
});
