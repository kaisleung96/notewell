/**
 * Core domain types shared across the notewell CLI and (eventually) the
 * optional MCP server.
 *
 * This file is deliberately small in v0.1; later tasks add ParsedMarkdown,
 * IndexRecord, SearchResult, LintFinding, DoctorCheck, etc.
 */

/**
 * The three core layers of a notewell vault. The fourth directory
 * (`.notewell/`) is a derived cache and is intentionally excluded here
 * because it is rebuildable from these three.
 */
export type VaultLayer = "raw" | "wiki" | "schema";

export type ParsedMarkdown = {
  frontmatter: Record<string, unknown>;
  body: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  parseError?: string;
};

export type IndexRecord = {
  slug: string;
  path: string;
  title: string;
  summary: string | null;
  type: string | null;
  domain: string | null;
  tags: string[];
  links: string[];
  backlinks: string[];
  updated_at: string;
  hash: string;
};

export type WikiIndex = {
  pages: IndexRecord[];
  generated_at: string;
};

export type SearchResult = {
  slug: string;
  path: string;
  title: string;
  summary: string | null;
  score: number;
  reasons: string[];
};

export type LintFinding = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export type DoctorCheck = {
  name: string;
  status: "ok" | "warn" | "fail";
  message: string;
};
