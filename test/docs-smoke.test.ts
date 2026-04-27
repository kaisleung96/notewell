import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const commands = [
  "notewell init",
  "notewell onboard",
  "notewell index",
  "notewell search",
  "notewell lint",
  "notewell log",
  "notewell doctor",
] as const;

describe("docs", () => {
  test("document every CLI command", () => {
    const docs = [
      readFileSync("README.md", "utf8"),
      readFileSync("docs/commands.md", "utf8"),
      readFileSync("docs/agent-workflows.md", "utf8"),
    ].join("\n");

    for (const command of commands) {
      expect(docs).toContain(command);
    }
  });

  test("document 1.0 guarantees and examples", () => {
    const docs = [
      readFileSync("README.md", "utf8"),
      readFileSync("docs/quickstart.md", "utf8"),
      readFileSync("docs/version-roadmap.md", "utf8"),
      readFileSync("docs/examples/android-ai-vault.md", "utf8"),
    ].join("\n");

    expect(docs).toContain("Markdown vault is the source of truth");
    expect(docs).toContain("JSON index is always available");
    expect(docs).toContain("MCP is optional");
    expect(docs).toContain("Embeddings are optional");
    expect(docs).toContain("Android performance article ingestion");
    expect(docs).toContain("AI paper ingestion");
    expect(docs).toContain("CS concept page");
    expect(docs).toContain("wiki/questions/");
    expect(docs).toContain("wiki/analyses/");
    expect(docs).toContain("wiki/playbooks/");
  });

  test("document how to run the local CLI path", () => {
    const docs = [
      readFileSync("README.md", "utf8"),
      readFileSync("README.zh-CN.md", "utf8"),
    ].join("\n");

    expect(docs).toContain("Run from the project root");
    expect(docs).toContain("从项目根目录执行");
    expect(docs).toContain("npm link");
  });

  test("document agent skill initialization", () => {
    const docs = [
      readFileSync("README.md", "utf8"),
      readFileSync("README.zh-CN.md", "utf8"),
      readFileSync("docs/commands.md", "utf8"),
      readFileSync("docs/agent-workflows.md", "utf8"),
    ].join("\n");

    expect(docs).toContain("notewell init --agent claude");
    expect(docs).toContain("notewell init --agent cursor");
    expect(docs).toContain("notewell init --agent codex");
    expect(docs).toContain("notewell-query");
    expect(docs).toContain("Search the vault before answering");
  });

  test("document referenced asset search behavior", () => {
    const docs = [
      readFileSync("README.md", "utf8"),
      readFileSync("README.zh-CN.md", "utf8"),
      readFileSync("docs/commands.md", "utf8"),
      readFileSync("docs/obsidian.md", "utf8"),
    ].join("\n");

    expect(docs).toContain("raw/assets/");
    expect(docs).toContain("referenced assets");
    expect(docs).toContain("[page]");
    expect(docs).toContain("[asset]");
    expect(docs).toContain("asset evidence");
    expect(docs).toContain("Obsidian");
    expect(docs).toContain("standard Markdown");
  });
});
