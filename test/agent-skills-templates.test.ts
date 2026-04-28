import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const agents = ["claude", "cursor", "codex"] as const;
const skills = ["notewell-ingest", "notewell-query", "notewell-lint"] as const;

function readSkill(skill: (typeof skills)[number]): string {
  return readFileSync(
    path.join("src", "templates", "agents", "skills", skill, "SKILL.md"),
    "utf8",
  );
}

describe("agent skill templates", () => {
  test("defines one canonical template for each Notewell skill", () => {
    for (const skill of skills) {
      expect(readSkill(skill)).toContain(`name: ${skill}`);
    }
  });

  test("does not keep adapter-specific skill template copies", () => {
    for (const agent of agents) {
      for (const skill of skills) {
        const adapterCopyPath = path.join(
          "src",
          "templates",
          "agents",
          agent,
          "skills",
          skill,
          "SKILL.md",
        );
        expect(() => readFileSync(adapterCopyPath, "utf8")).toThrow();
      }
    }
  });

  test("query skill forces vault retrieval", () => {
    const template = readSkill("notewell-query");

    expect(template).toContain("Search the vault before answering");
    expect(template).toContain("user-invocable: true");
    expect(template).toContain("AGENTS.md");
    expect(template).toContain("Read `wiki/index.md` first");
    expect(template).toContain("notewell query");
    expect(template).toContain("[[Page Title]]");
    expect(template).toContain("referenced assets");
    expect(template).toContain("supporting evidence");
    expect(template).toContain("本地知识库中未找到相关内容，以下为通用知识回答");
    expect(template).toContain("wiki/analyses/");
    expect(template).toContain("notewell log --type query");
    expect(template).toContain("notewell query");
  });

  test("ingest skill compiles sources into the wiki", () => {
    const template = readSkill("notewell-ingest");

    expect(template).toContain("AGENTS.md");
    expect(template).toContain("raw/");
    expect(template).toContain("wiki/sources/");
    expect(template).toContain("wiki/sources/<raw relative path>.md");
    expect(template).toContain("core thesis");
    expect(template).toContain("aliases, alt text, or link text");
    expect(template).toContain("without OCR");
    expect(template).toContain("Conflict Handling");
    expect(template).toContain("notewell index .");
    expect(template).toContain("notewell lint .");
  });

  test("lint skill checks wiki health", () => {
    const template = readSkill("notewell-lint");

    expect(template).toContain("user-invocable: true");
    expect(template).toContain("/health");
    expect(template).toContain("stale index entries");
    expect(template).toContain("unregistered pages");
    expect(template).toContain("unresolved");
    expect(template).toContain("knowledge conflict sections");
    expect(template).toContain("missing_asset_reference");
    expect(template).toContain("read-only");
    expect(template).toContain("知识库健康体检报告");
    expect(template).toContain("orphan pages");
    expect(template).toContain("notewell lint .");
    expect(template).toContain("notewell index .");
  });
});
