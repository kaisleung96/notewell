import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { initVault } from "../src/core/init.js";
import {
  defaultSearchBackend,
  getSearchBackend,
} from "../src/core/search-backend.js";

describe("search backend interface", () => {
  test("uses JSON index search as the mandatory default backend", async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), "notewell-backend-"));
    initVault(vaultDir);
    writeFileSync(
      path.join(vaultDir, "wiki", "backend.md"),
      [
        "---",
        "title: Backend Search",
        "summary: JSON index search remains the default.",
        "tags: [search]",
        "updated: 2026-04-27",
        "---",
        "",
        "The default backend searches the local JSON index.",
      ].join("\n"),
      "utf8",
    );

    await defaultSearchBackend.index(vaultDir);
    const results = await defaultSearchBackend.search(vaultDir, "backend");

    expect(defaultSearchBackend.name).toBe("json-index");
    expect(getSearchBackend().name).toBe("json-index");
    expect(getSearchBackend("json-index").name).toBe("json-index");
    expect(results[0]?.slug).toBe("wiki/backend");
  });
});
