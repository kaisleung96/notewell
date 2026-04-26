import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { initVault } from "../src/core/init.js";
import {
  doctorOperation,
  indexOperation,
  lintOperation,
  logOperation,
  searchOperation,
} from "../src/core/operations.js";

describe("core operations", () => {
  test("exposes reusable operations for CLI and integrations", () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-ops-"));
    initVault(vaultDir);
    writeFileSync(
      path.join(vaultDir, "wiki", "concept.md"),
      [
        "---",
        "title: Operation Pattern",
        "summary: Reusable operation wrappers for integrations.",
        "tags: [architecture]",
        "updated: 2026-04-27",
        "---",
        "",
        "Operation wrappers keep CLI and integrations aligned.",
      ].join("\n"),
      "utf8",
    );

    const index = indexOperation(vaultDir);
    const results = searchOperation(vaultDir, "operation");
    const lintFindings = lintOperation(vaultDir);
    const logEntry = logOperation(vaultDir, "record operation", { type: "note" });
    const doctorChecks = doctorOperation(vaultDir);

    expect(index.pages.some((page) => page.slug === "wiki/concept")).toBe(true);
    expect(results[0]?.slug).toBe("wiki/concept");
    expect(Array.isArray(lintFindings)).toBe(true);
    expect(logEntry).toContain("note | record operation");
    expect(doctorChecks.some((check) => check.name === "index")).toBe(true);
  });
});
