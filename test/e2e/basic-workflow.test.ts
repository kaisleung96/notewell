import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { doctorOperation, indexOperation, lintOperation, logOperation, searchOperation } from "../../src/core/operations.js";
import { initVault } from "../../src/core/init.js";

describe("basic notewell workflow", () => {
  test("runs init, ingest, index, search, lint, log, and doctor", () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-e2e-"));

    initVault(vaultDir);
    mkdirSync(path.join(vaultDir, "raw", "articles"), { recursive: true });
    mkdirSync(path.join(vaultDir, "wiki", "sources", "articles"), {
      recursive: true,
    });
    mkdirSync(path.join(vaultDir, "wiki", "concepts"), { recursive: true });

    writeFileSync(
      path.join(vaultDir, "raw", "articles", "compose-performance.md"),
      "# Compose Performance\n\nRaw article notes.",
      "utf8",
    );
    writeFileSync(
      path.join(vaultDir, "wiki", "sources", "articles", "compose-performance.md"),
      page("Compose Performance Source", "Source summary for Compose performance.", [
        "source",
        "android",
      ], "Links to [[wiki/concepts/recomposition]]."),
      "utf8",
    );
    writeFileSync(
      path.join(vaultDir, "wiki", "concepts", "recomposition.md"),
      page("Recomposition", "Compose recomposition invalidates UI state.", [
        "android",
        "performance",
      ], "Related source: [[wiki/sources/articles/compose-performance]]."),
      "utf8",
    );

    const index = indexOperation(vaultDir);
    const results = searchOperation(vaultDir, "recomposition");
    const lintFindings = lintOperation(vaultDir);
    const entry = logOperation(vaultDir, "ingested compose performance", {
      type: "ingest",
    });
    const doctorChecks = doctorOperation(vaultDir);

    expect(index.pages.some((record) => record.slug === "wiki/concepts/recomposition")).toBe(true);
    expect(results[0]?.slug).toBe("wiki/concepts/recomposition");
    expect(lintFindings.filter((finding) => finding.severity === "error")).toEqual([]);
    expect(entry).toContain("ingest | ingested compose performance");
    expect(readFileSync(path.join(vaultDir, "wiki", "log.md"), "utf8")).toContain(entry);
    expect(doctorChecks.every((check) => check.status !== "fail")).toBe(true);
  });
});

function page(
  title: string,
  summary: string,
  tags: string[],
  body: string,
): string {
  return [
    "---",
    `title: ${title}`,
    "type: note",
    `summary: ${summary}`,
    `tags: [${tags.join(", ")}]`,
    "updated: 2026-04-27",
    "---",
    "",
    body,
  ].join("\n");
}
