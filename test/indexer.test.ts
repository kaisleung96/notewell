import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { buildIndex } from "../src/core/indexer.js";

const createdTempDirs: string[] = [];

function copyFixture(name: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `notewell-${name}-`));
  createdTempDirs.push(dir);
  cpSync(path.join("test", "fixtures", name), dir, { recursive: true });
  return dir;
}

afterEach(() => {
  for (const dir of createdTempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("buildIndex", () => {
  test("indexes wiki pages, links, backlinks, and cache files", () => {
    const vaultDir = copyFixture("basic-vault");

    const index = buildIndex(vaultDir);

    expect(index.pages).toHaveLength(2);
    const recomposition = index.pages.find(
      (page) =>
        page.slug === "wiki/domains/android/jetpack-compose/recomposition",
    );
    expect(recomposition).toMatchObject({
      path: "wiki/domains/android/jetpack-compose/recomposition.md",
      title: "Compose Recomposition",
      summary: "A concept page about Jetpack Compose recomposition and performance.",
      type: "concept",
      domain: "android",
      tags: ["android", "compose", "performance"],
      links: ["wiki/concepts/state-invalidation"],
      backlinks: ["wiki/concepts/state-invalidation"],
      updated_at: "2026-04-27T00:00:00+08:00",
    });
    expect(recomposition?.hash).toMatch(/^[a-f0-9]{64}$/);

    const cacheDir = path.join(vaultDir, ".notewell");
    expect(existsSync(path.join(cacheDir, "index.json"))).toBe(true);
    expect(existsSync(path.join(cacheDir, "backlinks.json"))).toBe(true);
    expect(existsSync(path.join(cacheDir, "manifest.json"))).toBe(true);

    const backlinks = JSON.parse(
      readFileSync(path.join(cacheDir, "backlinks.json"), "utf8"),
    ) as Record<string, string[]>;
    expect(backlinks["wiki/concepts/state-invalidation"]).toEqual([
      "wiki/domains/android/jetpack-compose/recomposition",
    ]);
  });

  test("indexes raw assets referenced from wiki pages", () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-assets-"));
    createdTempDirs.push(vaultDir);
    const wikiDir = path.join(vaultDir, "wiki");
    const assetsDir = path.join(vaultDir, "raw", "assets");
    mkdirSync(wikiDir, { recursive: true });
    mkdirSync(assetsDir, { recursive: true });

    const architecturePath = path.join(assetsDir, "architecture.png");
    const specPath = path.join(assetsDir, "spec.pdf");
    writeFileSync(architecturePath, "fake image content");
    writeFileSync(specPath, "fake pdf content");
    writeFileSync(
      path.join(wikiDir, "architecture.md"),
      [
        "# Architecture",
        "",
        "![[raw/assets/architecture.png|系统架构图]]",
        "[[raw/assets/spec.pdf|设计说明]]",
        "![Architecture Diagram](../raw/assets/architecture.png)",
        "[Spec PDF](../raw/assets/spec.pdf)",
      ].join("\n"),
    );

    const index = buildIndex(vaultDir);

    const architecturePage = index.pages.find(
      (page) => page.slug === "wiki/architecture",
    );
    expect(architecturePage?.links).not.toContain("raw/assets/architecture.png");
    expect(architecturePage?.links).not.toContain("raw/assets/spec.pdf");

    expect(index.assets).toHaveLength(2);
    const architecture = index.assets.find(
      (asset) => asset.path === "raw/assets/architecture.png",
    );
    expect(architecture).toMatchObject({
      title: "architecture.png",
      asset_kind: "image",
      extension: ".png",
      referenced_by: ["wiki/architecture"],
    });
    expect(architecture?.hash).toBe(
      createHash("sha256")
        .update(readFileSync(architecturePath))
        .digest("hex"),
    );

    const syntaxes = index.assets.flatMap((asset) =>
      asset.references.map((reference) => reference.reference_syntax),
    );
    expect(syntaxes.sort()).toEqual([
      "markdown-image",
      "markdown-link",
      "obsidian-embed",
      "obsidian-wikilink",
    ]);

    const manifest = JSON.parse(
      readFileSync(path.join(vaultDir, ".notewell", "manifest.json"), "utf8"),
    ) as { asset_count?: number };
    expect(manifest.asset_count).toBe(2);

    const backlinks = JSON.parse(
      readFileSync(path.join(vaultDir, ".notewell", "backlinks.json"), "utf8"),
    ) as Record<string, string[]>;
    expect(backlinks).not.toHaveProperty("raw/assets/architecture.png");
    expect(backlinks).not.toHaveProperty("raw/assets/spec.pdf");
  });

  test("excludes relative Obsidian asset references from wiki links", () => {
    const vaultDir = mkdtempSync(
      path.join(tmpdir(), "notewell-relative-assets-"),
    );
    createdTempDirs.push(vaultDir);
    const wikiDir = path.join(vaultDir, "wiki", "notes");
    const assetsDir = path.join(vaultDir, "raw", "assets");
    mkdirSync(wikiDir, { recursive: true });
    mkdirSync(assetsDir, { recursive: true });

    const architecturePath = path.join(assetsDir, "architecture.png");
    const specPath = path.join(assetsDir, "spec.pdf");
    writeFileSync(architecturePath, "fake nested image content");
    writeFileSync(specPath, "fake nested pdf content");
    writeFileSync(
      path.join(wikiDir, "architecture.md"),
      [
        "# Nested Architecture",
        "",
        "![[../../raw/assets/architecture.png|图]]",
        "[[../../raw/assets/spec.pdf|说明]]",
      ].join("\n"),
    );

    const index = buildIndex(vaultDir);
    const architecturePage = index.pages.find(
      (page) => page.slug === "wiki/notes/architecture",
    );

    expect(index.assets.map((asset) => asset.path).sort()).toEqual([
      "raw/assets/architecture.png",
      "raw/assets/spec.pdf",
    ]);
    expect(architecturePage?.links).not.toContain(
      "../../raw/assets/architecture.png",
    );
    expect(architecturePage?.links).not.toContain("../../raw/assets/spec.pdf");

    const backlinks = JSON.parse(
      readFileSync(path.join(vaultDir, ".notewell", "backlinks.json"), "utf8"),
    ) as Record<string, string[]>;
    expect(backlinks).not.toHaveProperty("../../raw/assets/architecture.png");
    expect(backlinks).not.toHaveProperty("../../raw/assets/spec.pdf");
    expect(backlinks).not.toHaveProperty("raw/assets/architecture.png");
    expect(backlinks).not.toHaveProperty("raw/assets/spec.pdf");
  });

  test("indexes Markdown asset links with optional titles", () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-titled-assets-"));
    createdTempDirs.push(vaultDir);
    const wikiDir = path.join(vaultDir, "wiki");
    const assetsDir = path.join(vaultDir, "raw", "assets");
    mkdirSync(wikiDir, { recursive: true });
    mkdirSync(assetsDir, { recursive: true });

    writeFileSync(path.join(assetsDir, "architecture.png"), "fake image");
    writeFileSync(path.join(assetsDir, "spec.pdf"), "fake pdf");
    writeFileSync(
      path.join(wikiDir, "architecture.md"),
      [
        "# Architecture",
        "",
        '![Architecture Diagram](../raw/assets/architecture.png "diagram title")',
        '[Spec PDF](../raw/assets/spec.pdf "Spec title")',
      ].join("\n"),
    );

    const index = buildIndex(vaultDir);

    expect(index.assets.map((asset) => asset.path).sort()).toEqual([
      "raw/assets/architecture.png",
      "raw/assets/spec.pdf",
    ]);
    const architecture = index.assets.find(
      (asset) => asset.path === "raw/assets/architecture.png",
    );
    const spec = index.assets.find(
      (asset) => asset.path === "raw/assets/spec.pdf",
    );
    expect(architecture?.references).toEqual([
      expect.objectContaining({
        label: "Architecture Diagram",
        raw_target: "../raw/assets/architecture.png",
      }),
    ]);
    expect(spec?.references).toEqual([
      expect.objectContaining({
        label: "Spec PDF",
        raw_target: "../raw/assets/spec.pdf",
      }),
    ]);
  });

  test("does not index asset symlinks that point outside the vault", () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-symlink-assets-"));
    const outsideDir = mkdtempSync(path.join(tmpdir(), "notewell-outside-"));
    createdTempDirs.push(vaultDir, outsideDir);
    const wikiDir = path.join(vaultDir, "wiki");
    const assetsDir = path.join(vaultDir, "raw", "assets");
    mkdirSync(wikiDir, { recursive: true });
    mkdirSync(assetsDir, { recursive: true });

    const outsideAssetPath = path.join(outsideDir, "outside.png");
    writeFileSync(outsideAssetPath, "outside image");
    symlinkSync(outsideAssetPath, path.join(assetsDir, "link.png"));
    writeFileSync(
      path.join(wikiDir, "architecture.md"),
      ["# Architecture", "", "![Outside](../raw/assets/link.png)"].join("\n"),
    );

    const index = buildIndex(vaultDir);

    expect(index.assets).toEqual([]);
  });
});
