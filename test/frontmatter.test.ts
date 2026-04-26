import { describe, expect, test } from "vitest";

import { parseMarkdown } from "../src/core/frontmatter.js";

describe("parseMarkdown", () => {
  test("parses valid frontmatter and body", () => {
    const parsed = parseMarkdown(`---
title: Compose Recomposition
summary: How Compose decides what to redraw.
type: concept
tags: [android, compose, performance]
---

# Compose Recomposition

Body text.
`);

    expect(parsed.frontmatter).toMatchObject({
      title: "Compose Recomposition",
      summary: "How Compose decides what to redraw.",
      type: "concept",
      tags: ["android", "compose", "performance"],
    });
    expect(parsed.title).toBe("Compose Recomposition");
    expect(parsed.summary).toBe("How Compose decides what to redraw.");
    expect(parsed.tags).toEqual(["android", "compose", "performance"]);
    expect(parsed.body).toContain("Body text.");
    expect(parsed.parseError).toBeUndefined();
  });

  test("returns empty metadata when frontmatter is missing", () => {
    const parsed = parseMarkdown("# No Frontmatter\n\nBody text.");

    expect(parsed.frontmatter).toEqual({});
    expect(parsed.title).toBeNull();
    expect(parsed.summary).toBeNull();
    expect(parsed.tags).toEqual([]);
    expect(parsed.body).toBe("# No Frontmatter\n\nBody text.");
    expect(parsed.parseError).toBeUndefined();
  });

  test("reports invalid frontmatter without dropping the body", () => {
    const parsed = parseMarkdown(`---
title: Bad Page
tags: [android, compose
---

Body text.
`);

    expect(parsed.parseError).toContain("Invalid frontmatter");
    expect(parsed.title).toBeNull();
    expect(parsed.tags).toEqual([]);
    expect(parsed.body).toContain("Body text.");
  });
});
