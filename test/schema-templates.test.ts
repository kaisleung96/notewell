import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const schemaDir = path.join(process.cwd(), "src", "templates", "schema");

describe("agent schema templates", () => {
  test("harden multi-agent baseline workflow rules", () => {
    const combined = [
      "AGENTS.md",
      "CLAUDE.md",
      "ingestion.md",
      "query.md",
      "maintenance.md",
    ]
      .map((file) => readFileSync(path.join(schemaDir, file), "utf8"))
      .join("\n")
      .toLowerCase()
      .replaceAll("`", "");

    expect(combined).toContain("baseline workflow");
    expect(combined).toContain("mcp is optional");
    expect(combined).toContain("embeddings are optional");
    expect(combined).toContain("raw/ is read-only");
    expect(combined).toContain("write back");
    expect(combined).toContain("run notewell lint before completion");
  });
});
