import { describe, expect, test } from "vitest";

import { buildHelpText } from "../src/cli.js";

describe("cli help", () => {
  test("prints available commands", () => {
    const help = buildHelpText();
    expect(help).toContain("notewell init");
    expect(help).toContain("notewell index");
    expect(help).toContain("notewell search");
    expect(help).toContain("notewell lint");
    expect(help).toContain("notewell log");
    expect(help).toContain("notewell doctor");
  });
});
