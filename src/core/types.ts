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
