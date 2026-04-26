import type { ParsedMarkdown } from "./types.js";

export function parseMarkdown(markdown: string): ParsedMarkdown {
  const frontmatterBlock = splitFrontmatter(markdown);
  if (!frontmatterBlock) {
    return {
      frontmatter: {},
      body: markdown,
      title: null,
      summary: null,
      tags: [],
    };
  }

  const parsed = parseFrontmatterBlock(frontmatterBlock.frontmatter);
  if (typeof parsed === "string") {
    return {
      frontmatter: {},
      body: frontmatterBlock.body,
      title: null,
      summary: null,
      tags: [],
      parseError: `Invalid frontmatter: ${parsed}`,
    };
  }

  return {
    frontmatter: parsed,
    body: frontmatterBlock.body,
    title: stringField(parsed.title),
    summary: stringField(parsed.summary),
    tags: stringArrayField(parsed.tags),
  };
}

function splitFrontmatter(
  markdown: string,
): { frontmatter: string; body: string } | null {
  if (!markdown.startsWith("---\n") && !markdown.startsWith("---\r\n")) {
    return null;
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return {
      frontmatter: normalized.slice(4),
      body: "",
    };
  }

  return {
    frontmatter: normalized.slice(4, end),
    body: normalized.slice(end + "\n---\n".length),
  };
}

function parseFrontmatterBlock(
  frontmatter: string,
): Record<string, unknown> | string {
  const result: Record<string, unknown> = {};
  const lines = frontmatter.split("\n");
  let currentListKey: string | null = null;

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) {
      continue;
    }

    if (currentListKey && /^\s+-\s+/.test(rawLine)) {
      const existing = result[currentListKey];
      if (!Array.isArray(existing)) {
        return `line for ${currentListKey} is not a list`;
      }
      existing.push(parseScalar(rawLine.trim().slice(2)));
      continue;
    }

    currentListKey = null;
    const match = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(rawLine);
    if (!match) {
      return `could not parse line "${rawLine}"`;
    }

    const key = match[1];
    const valueText = match[2] ?? "";
    if (!key) {
      return `missing key in line "${rawLine}"`;
    }

    if (valueText === "") {
      result[key] = [];
      currentListKey = key;
      continue;
    }

    const value = parseValue(valueText);
    if (value instanceof Error) {
      return value.message;
    }
    result[key] = value;
  }

  return result;
}

function parseValue(valueText: string): unknown | Error {
  const trimmed = valueText.trim();
  if (trimmed.startsWith("[") || trimmed.endsWith("]")) {
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
      return new Error(`invalid array value "${valueText}"`);
    }
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner.split(",").map((part) => parseScalar(part.trim()));
  }

  return parseScalar(trimmed);
}

function parseScalar(valueText: string): string | boolean | number | null {
  if (valueText === "true") {
    return true;
  }
  if (valueText === "false") {
    return false;
  }
  if (valueText === "null") {
    return null;
  }
  if (
    (valueText.startsWith('"') && valueText.endsWith('"')) ||
    (valueText.startsWith("'") && valueText.endsWith("'"))
  ) {
    return valueText.slice(1, -1);
  }
  const numeric = Number(valueText);
  if (valueText !== "" && Number.isFinite(numeric)) {
    return numeric;
  }
  return valueText;
}

function stringField(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringArrayField(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}
