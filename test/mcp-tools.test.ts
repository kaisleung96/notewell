import { describe, expect, test } from "vitest";

import { createMcpToolHandlers, listMcpTools } from "../src/mcp/server.js";

describe("optional MCP tools", () => {
  test("exposes tools equivalent to core operations", () => {
    expect(listMcpTools().map((tool) => tool.name)).toEqual([
      "index",
      "search",
      "lint",
      "doctor",
      "append_log",
    ]);
  });

  test("provides handlers without requiring MCP SDK startup", () => {
    const handlers = createMcpToolHandlers();

    expect(Object.keys(handlers).sort()).toEqual([
      "append_log",
      "doctor",
      "index",
      "lint",
      "search",
    ]);
  });
});
