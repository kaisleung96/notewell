import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const commands = [
  "notewell init",
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
});
