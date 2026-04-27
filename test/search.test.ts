import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { buildIndex } from "../src/core/indexer.js";
import { searchIndex } from "../src/core/search.js";

const createdTempDirs: string[] = [];

function createVault(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "notewell-search-"));
  createdTempDirs.push(dir);
  mkdirSync(path.join(dir, "wiki"), { recursive: true });
  return dir;
}

function writePage(vaultDir: string, relativePath: string, markdown: string): void {
  const filePath = path.join(vaultDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, markdown, "utf8");
}

afterEach(() => {
  for (const dir of createdTempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("searchIndex", () => {
  test("treats missing assets in legacy indexes as empty", () => {
    const vaultDir = createVault();
    writePage(
      vaultDir,
      "wiki/legacy.md",
      `---
title: Legacy Index
summary: Old cache shape.
type: concept
tags: [legacy]
---

Body text.
`,
    );
    mkdirSync(path.join(vaultDir, ".notewell"), { recursive: true });
    writeFileSync(
      path.join(vaultDir, ".notewell", "index.json"),
      JSON.stringify(
        {
          pages: [
            {
              slug: "wiki/legacy",
              path: "wiki/legacy.md",
              title: "Legacy Index",
              summary: "Old cache shape.",
              type: "concept",
              domain: null,
              tags: ["legacy"],
              links: [],
              backlinks: [],
              updated_at: "2026-04-27T00:00:00+08:00",
              hash: "legacy",
            },
          ],
          generated_at: "2026-04-27T00:00:00+08:00",
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(() => searchIndex(vaultDir, "legacy")).not.toThrow();
    expect(searchIndex(vaultDir, "legacy")).toEqual([
      expect.objectContaining({
        kind: "page",
        slug: "wiki/legacy",
        assets: [],
      }),
    ]);
  });

  test("ranks title, tag, summary, then body matches", () => {
    const vaultDir = createVault();
    writePage(
      vaultDir,
      "wiki/title.md",
      `---
title: Compose Runtime
summary: Runtime notes.
type: concept
tags: [runtime]
---

Body text.
`,
    );
    writePage(
      vaultDir,
      "wiki/tag.md",
      `---
title: Tagged Page
summary: Tag notes.
type: concept
tags: [compose]
---

Body text.
`,
    );
    writePage(
      vaultDir,
      "wiki/summary.md",
      `---
title: Summary Page
summary: Mentions compose in summary.
type: concept
tags: [summary]
---

Body text.
`,
    );
    writePage(
      vaultDir,
      "wiki/body.md",
      `---
title: Body Page
summary: Body notes.
type: concept
tags: [body]
---

Mentions compose in body.
`,
    );
    buildIndex(vaultDir);

    const results = searchIndex(vaultDir, "compose");
    const pageResults = results.filter((result) => result.kind === "page");

    expect(pageResults.map((result) => result.slug)).toEqual([
      "wiki/title",
      "wiki/tag",
      "wiki/summary",
      "wiki/body",
    ]);
    expect(pageResults[0]?.reasons).toContain("title match");
    expect(pageResults[1]?.reasons).toContain("tag match");
    expect(pageResults[2]?.reasons).toContain("summary match");
    expect(pageResults[3]?.reasons).toContain("body match");
  });

  test("returns referenced assets on matching page results", () => {
    const vaultDir = createVault();
    writePage(vaultDir, "raw/assets/architecture.png", "fake image");
    writePage(
      vaultDir,
      "wiki/systems-map.md",
      `---
title: Systems Map
summary: Notes about service boundaries.
type: concept
tags: [architecture]
---

![Architecture Diagram](../raw/assets/architecture.png)
`,
    );
    buildIndex(vaultDir);

    const results = searchIndex(vaultDir, "systems map");
    const pageResult = results.find(
      (result) => result.kind === "page" && result.slug === "wiki/systems-map",
    );

    expect(pageResult?.assets.map((asset) => asset.path)).toEqual([
      "raw/assets/architecture.png",
    ]);
  });

  test("returns matching asset results with references", () => {
    const vaultDir = createVault();
    writePage(vaultDir, "raw/assets/architecture.png", "fake image");
    writePage(
      vaultDir,
      "wiki/systems-map.md",
      `---
title: Systems Map
summary: Notes about service boundaries.
type: concept
tags: [architecture]
---

![Architecture Diagram](../raw/assets/architecture.png)
`,
    );
    buildIndex(vaultDir);

    const results = searchIndex(vaultDir, "Architecture Diagram");
    const assetResult = results.find(
      (result) =>
        result.kind === "asset" && result.path === "raw/assets/architecture.png",
    );

    expect(assetResult?.references).toEqual([
      expect.objectContaining({
        label: "Architecture Diagram",
        page_slug: "wiki/systems-map",
      }),
    ]);
    expect(assetResult?.reasons).toContain("label match");
  });

  test("does not return assets when only the reference boost applies", () => {
    const vaultDir = createVault();
    writePage(vaultDir, "raw/assets/architecture.png", "fake image");
    writePage(
      vaultDir,
      "wiki/systems-map.md",
      `---
title: Systems Map
summary: Notes about service boundaries.
type: concept
tags: [architecture]
---

![Architecture Diagram](../raw/assets/architecture.png)
`,
    );
    buildIndex(vaultDir);

    const results = searchIndex(vaultDir, "unrelated");

    expect(results).toEqual([]);
  });
});
