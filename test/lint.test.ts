import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { lintVault } from "../src/core/lint.js";

const createdTempDirs: string[] = [];

function copyFixture(name: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `notewell-${name}-`));
  createdTempDirs.push(dir);
  cpSync(path.join("test", "fixtures", name), dir, { recursive: true });
  return dir;
}

function createAssetReferenceVault(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "notewell-asset-lint-"));
  createdTempDirs.push(dir);

  mkdirSync(path.join(dir, "raw", "assets"), { recursive: true });
  mkdirSync(path.join(dir, "wiki"), { recursive: true });
  writeFileSync(path.join(dir, "raw", "assets", "architecture.png"), "png", "utf8");
  writeFileSync(
    path.join(dir, "wiki", "asset-references.md"),
    `---
title: Asset References
summary: Checks asset references.
tags:
  - assets
---

Existing asset: ![[raw/assets/architecture.png]]
Missing Obsidian asset: ![[raw/assets/missing.png]]
Missing Markdown asset: ![Missing](../raw/assets/missing-from-markdown.png)
`,
    "utf8",
  );

  return dir;
}

function createKnowledgeConflictVault(heading: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "notewell-conflict-lint-"));
  createdTempDirs.push(dir);

  mkdirSync(path.join(dir, "wiki"), { recursive: true });
  writeFileSync(
    path.join(dir, "wiki", "index.md"),
    `---
title: Index
summary: Test index.
tags: [index]
---

[[wiki/conflict]]
`,
    "utf8",
  );
  writeFileSync(
    path.join(dir, "wiki", "conflict.md"),
    `---
title: Conflict
summary: Contains unresolved conflict.
tags: [conflict]
---

${heading}

- Source A says one thing.
- Source B says another.
`,
    "utf8",
  );

  return dir;
}

afterEach(() => {
  for (const dir of createdTempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("lintVault", () => {
  test("detects invalid metadata, broken links, and orphan pages", () => {
    const findings = lintVault(copyFixture("broken-links"));

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_frontmatter",
          path: "wiki/invalid-frontmatter.md",
          severity: "error",
        }),
        expect.objectContaining({
          code: "missing_title",
          path: "wiki/missing-fields.md",
          severity: "error",
        }),
        expect.objectContaining({
          code: "missing_summary",
          path: "wiki/missing-fields.md",
          severity: "error",
        }),
        expect.objectContaining({
          code: "missing_tags",
          path: "wiki/missing-fields.md",
          severity: "error",
        }),
        expect.objectContaining({
          code: "broken_wikilink",
          path: "wiki/broken.md",
          severity: "error",
        }),
        expect.objectContaining({
          code: "orphan_page",
          path: "wiki/orphan.md",
          severity: "warning",
        }),
        expect.objectContaining({
          code: "unregistered_index_page",
          path: "wiki/broken.md",
          severity: "warning",
        }),
        expect.objectContaining({
          code: "unresolved_knowledge_conflict",
          path: "wiki/conflict.md",
          severity: "warning",
        }),
        expect.objectContaining({
          code: "stale_index_entry",
          path: "wiki/index.md",
          severity: "warning",
        }),
      ]),
    );
  });

  test("detects raw files without source wiki pages", () => {
    const findings = lintVault(copyFixture("raw-without-source"));

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "raw_without_source",
          path: "raw/articles/compose-performance.md",
          severity: "warning",
        }),
      ]),
    );
  });

  test("warns about missing asset references without treating assets as wikilinks", () => {
    const findings = lintVault(createAssetReferenceVault());

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_asset_reference",
          path: "wiki/asset-references.md",
          severity: "warning",
          message: expect.stringContaining("raw/assets/missing.png"),
        }),
        expect.objectContaining({
          code: "missing_asset_reference",
          path: "wiki/asset-references.md",
          severity: "warning",
          message: expect.stringContaining("raw/assets/missing-from-markdown.png"),
        }),
      ]),
    );
    expect(findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "broken_wikilink",
          path: "wiki/asset-references.md",
        }),
      ]),
    );
    expect(findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_asset_reference",
          message: expect.stringContaining("raw/assets/architecture.png"),
        }),
      ]),
    );
  });

  test("detects English knowledge conflict headings", () => {
    const findings = lintVault(createKnowledgeConflictVault("## Knowledge Conflict"));

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unresolved_knowledge_conflict",
          path: "wiki/conflict.md",
          severity: "warning",
        }),
      ]),
    );
  });
});
