import {
  doctorOperation,
  indexOperation,
  lintOperation,
  logOperation,
  searchOperation,
} from "../core/operations.js";

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type McpToolHandlers = Record<
  string,
  (input: Record<string, unknown>) => unknown
>;

const VAULT_DIR_PROPERTY = {
  type: "string",
  description: "Path to the notewell vault directory.",
};

export function listMcpTools(): McpToolDefinition[] {
  return [
    {
      name: "index",
      description: "Rebuild the JSON index for a notewell vault.",
      inputSchema: {
        type: "object",
        properties: { vaultDir: VAULT_DIR_PROPERTY },
        required: ["vaultDir"],
      },
    },
    {
      name: "search",
      description: "Search the JSON index for matching wiki pages.",
      inputSchema: {
        type: "object",
        properties: {
          vaultDir: VAULT_DIR_PROPERTY,
          query: { type: "string", description: "Search query." },
        },
        required: ["vaultDir", "query"],
      },
    },
    {
      name: "lint",
      description: "Lint vault frontmatter, links, orphans, and raw sources.",
      inputSchema: {
        type: "object",
        properties: { vaultDir: VAULT_DIR_PROPERTY },
        required: ["vaultDir"],
      },
    },
    {
      name: "doctor",
      description: "Check vault structure and derived index freshness.",
      inputSchema: {
        type: "object",
        properties: { vaultDir: VAULT_DIR_PROPERTY },
        required: ["vaultDir"],
      },
    },
    {
      name: "append_log",
      description: "Append a structured entry to wiki/log.md.",
      inputSchema: {
        type: "object",
        properties: {
          vaultDir: VAULT_DIR_PROPERTY,
          message: { type: "string", description: "Log message." },
          type: { type: "string", description: "Entry type, defaults to note." },
        },
        required: ["vaultDir", "message"],
      },
    },
  ];
}

export function createMcpToolHandlers(): McpToolHandlers {
  return {
    index: (input) => indexOperation(requiredString(input, "vaultDir")),
    search: (input) =>
      searchOperation(requiredString(input, "vaultDir"), requiredString(input, "query")),
    lint: (input) => lintOperation(requiredString(input, "vaultDir")),
    doctor: (input) => doctorOperation(requiredString(input, "vaultDir")),
    append_log: (input) => {
      const type = optionalString(input, "type");
      return logOperation(
        requiredString(input, "vaultDir"),
        requiredString(input, "message"),
        type ? { type } : {},
      );
    },
  };
}

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`MCP tool input requires string field: ${key}`);
  }
  return value;
}

function optionalString(
  input: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
