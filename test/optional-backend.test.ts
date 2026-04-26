import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { initVault } from "../src/core/init.js";
import { getSearchBackend } from "../src/core/search-backend.js";

describe("optional search backends", () => {
  test("falls back to JSON index when FlexSearch is unavailable", async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-flex-"));
    initVault(vaultDir);
    writeFileSync(
      path.join(vaultDir, "wiki", "flexsearch.md"),
      [
        "---",
        "title: FlexSearch Fallback",
        "summary: Optional advanced search should not replace JSON search.",
        "tags: [search]",
        "updated: 2026-04-27",
        "---",
        "",
        "The flexsearch backend can fall back to JSON index search.",
      ].join("\n"),
      "utf8",
    );

    const backend = getSearchBackend("flexsearch");
    await backend.index(vaultDir);
    const results = await backend.search(vaultDir, "fallback");

    expect(backend.name).toBe("flexsearch");
    expect(results[0]?.slug).toBe("wiki/flexsearch");
    expect(results[0]?.reasons).toContain("json backend fallback");
  });
});
