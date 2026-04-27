import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { buildHelpText, run } from "../src/cli.js";
import { initVault } from "../src/core/init.js";
import { indexOperation } from "../src/core/operations.js";

describe("cli help", () => {
  test("prints available commands", () => {
    const help = buildHelpText();
    expect(help).toContain("notewell init");
    expect(help).toContain("notewell index");
    expect(help).toContain("notewell search");
    expect(help).toContain("notewell onboard");
    expect(help).toContain("notewell lint");
    expect(help).toContain("notewell log");
    expect(help).toContain("notewell doctor");
  });

  test("treats query as a search command alias", async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-cli-query-"));
    initVault(vaultDir);
    writeFileSync(
      path.join(vaultDir, "wiki", "concept.md"),
      [
        "---",
        "title: Query Alias",
        "summary: Query command should trigger knowledge retrieval.",
        "tags: [retrieval]",
        "updated: 2026-04-27",
        "---",
        "",
        "Knowledge retrieval reads the indexed wiki.",
      ].join("\n"),
      "utf8",
    );
    indexOperation(vaultDir);
    let stdout = "";
    let stderr = "";
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        stdout += chunk.toString();
        return true;
      });
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        stderr += chunk.toString();
        return true;
      });

    try {
      const code = await run(["query", "retrieval", vaultDir]);

      expect(code).toBe(0);
      expect(stdout).toContain("wiki/concept");
      expect(stderr).not.toContain("unknown command");
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });

  test("formats search output for page and asset results", async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-cli-search-"));
    initVault(vaultDir);
    mkdirSync(path.join(vaultDir, "raw", "assets"), { recursive: true });
    writeFileSync(
      path.join(vaultDir, "raw", "assets", "architecture.png"),
      "fake image",
      "utf8",
    );
    writeFileSync(
      path.join(vaultDir, "wiki", "architecture.md"),
      [
        "---",
        "title: Architecture",
        "summary: Architecture notes.",
        "tags: [architecture]",
        "updated: 2026-04-27",
        "---",
        "",
        "![Architecture Diagram](../raw/assets/architecture.png)",
      ].join("\n"),
      "utf8",
    );
    indexOperation(vaultDir);
    let stdout = "";
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        stdout += chunk.toString();
        return true;
      });

    try {
      const searchCode = await run(["search", "architecture", vaultDir]);
      const searchOutput = stdout;
      stdout = "";
      const queryCode = await run(["query", "architecture", vaultDir]);

      expect(searchCode).toBe(0);
      expect(queryCode).toBe(0);
      expect(searchOutput).toContain(
        "[page] wiki/architecture\t230\ttitle match, tag match, summary match, body match\tArchitecture\n",
      );
      expect(searchOutput).toContain(
        "  asset: raw/assets/architecture.png [markdown-image: Architecture Diagram]\n",
      );
      expect(searchOutput).toContain(
        "[asset] raw/assets/architecture.png\t293\ttitle match, path match, label match, referencing page title match, referencing page summary match, referencing page tag match, reference boost\tarchitecture.png\n",
      );
      expect(stdout).toBe(searchOutput);
    } finally {
      stdoutSpy.mockRestore();
    }
  });

  test("initializes selected agent skill adapters", async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-cli-agents-"));

    const code = await run([
      "init",
      "--agent",
      "claude",
      "--agent",
      "cursor",
      vaultDir,
    ]);

    expect(code).toBe(0);
    expect(
      existsSync(
        path.join(vaultDir, ".claude/skills/notewell-query/SKILL.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.join(vaultDir, ".cursor/skills/notewell-query/SKILL.md"),
      ),
    ).toBe(true);
  });

  test("runs onboard in yes mode", async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-cli-onboard-"));

    const code = await run(["onboard", "--yes", "--agent", "cursor", vaultDir]);

    expect(code).toBe(0);
    expect(
      existsSync(path.join(vaultDir, ".cursor/skills/notewell-query/SKILL.md")),
    ).toBe(true);
  });

  test("rejects unknown agent adapters", async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-cli-agent-"));
    let stderr = "";
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        stderr += chunk.toString();
        return true;
      });

    try {
      const code = await run(["init", "--agent", "unknown", vaultDir]);

      expect(code).toBe(1);
      expect(stderr).toContain("unknown agent");
    } finally {
      stderrSpy.mockRestore();
    }
  });
});
