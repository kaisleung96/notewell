import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { parseMarkdown } from "./frontmatter.js";
import {
  extractAssetReferences,
  extractWikiLinks,
  type ExtractedAssetReference,
} from "./indexer.js";
import { isMarkdownFile, normalizePath, slugFromWikiPath } from "./paths.js";
import type { LintFinding } from "./types.js";

type PageInfo = {
  path: string;
  slug: string;
  links: string[];
  assetReferences: ExtractedAssetReference[];
  body: string;
};

export function lintVault(vaultDir: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const pages = lintWikiPages(vaultDir, findings);
  lintAssetReferences(vaultDir, pages, findings);
  lintBrokenLinks(pages, findings);
  lintOrphans(pages, findings);
  lintIndexRegistration(pages, findings);
  lintKnowledgeConflicts(pages, findings);
  lintRawSources(vaultDir, findings);
  return findings.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
}

function lintWikiPages(vaultDir: string, findings: LintFinding[]): PageInfo[] {
  const wikiDir = path.join(vaultDir, "wiki");
  if (!existsSync(wikiDir)) {
    return [];
  }

  const pages: PageInfo[] = [];
  for (const filePath of listMarkdownFiles(wikiDir)) {
    const relativePath = normalizePath(path.relative(vaultDir, filePath));
    const markdown = readFileSync(filePath, "utf8");
    const parsed = parseMarkdown(markdown);
    const slug = slugFromWikiPath(relativePath);

    if (parsed.parseError) {
      findings.push(error("invalid_frontmatter", relativePath, parsed.parseError));
    }
    if (!parsed.title) {
      findings.push(error("missing_title", relativePath, "Missing required title frontmatter."));
    }
    if (!parsed.summary) {
      findings.push(
        error("missing_summary", relativePath, "Missing required summary frontmatter."),
      );
    }
    if (parsed.tags.length === 0) {
      findings.push(error("missing_tags", relativePath, "Missing required tags frontmatter."));
    }

    pages.push({
      path: relativePath,
      slug,
      links: extractWikiLinks(parsed.body, relativePath),
      assetReferences: extractAssetReferences(parsed.body, {
        path: relativePath,
        slug,
      }),
      body: parsed.body,
    });
  }

  return pages;
}

function lintAssetReferences(
  vaultDir: string,
  pages: PageInfo[],
  findings: LintFinding[],
): void {
  for (const page of pages) {
    for (const reference of page.assetReferences) {
      const absoluteAssetPath = path.join(vaultDir, reference.asset_path);
      if (existsSync(absoluteAssetPath) && statSync(absoluteAssetPath).isFile()) {
        continue;
      }
      findings.push(
        warning(
          "missing_asset_reference",
          page.path,
          `Asset reference does not exist: ${reference.asset_path}.`,
        ),
      );
    }
  }
}

function lintBrokenLinks(pages: PageInfo[], findings: LintFinding[]): void {
  const slugs = new Set(pages.map((page) => page.slug));
  for (const page of pages) {
    for (const link of page.links) {
      if (!slugs.has(link)) {
        findings.push(
          error("broken_wikilink", page.path, `Wikilink target does not exist: ${link}`),
        );
      }
    }
  }
}

function lintOrphans(pages: PageInfo[], findings: LintFinding[]): void {
  const backlinks = new Map<string, number>();
  for (const page of pages) {
    for (const link of page.links) {
      backlinks.set(link, (backlinks.get(link) ?? 0) + 1);
    }
  }

  for (const page of pages) {
    if (page.slug === "wiki/index" || page.slug === "wiki/log") {
      continue;
    }
    if (page.links.length === 0 && (backlinks.get(page.slug) ?? 0) === 0) {
      findings.push(
        warning("orphan_page", page.path, "Page has no wikilinks or backlinks."),
      );
    }
  }
}

function lintIndexRegistration(pages: PageInfo[], findings: LintFinding[]): void {
  const indexPage = pages.find((page) => page.slug === "wiki/index");
  if (!indexPage) {
    return;
  }

  const slugs = new Set(pages.map((page) => page.slug));
  const registered = new Set(indexPage.links);

  for (const link of indexPage.links) {
    if (!slugs.has(link)) {
      findings.push(
        warning("stale_index_entry", indexPage.path, `Index registers missing page: ${link}.`),
      );
    }
  }

  for (const page of pages) {
    if (page.slug === "wiki/index" || page.slug === "wiki/log") {
      continue;
    }
    if (!registered.has(page.slug)) {
      findings.push(
        warning(
          "unregistered_index_page",
          page.path,
          "Wiki page exists but is not registered in wiki/index.md.",
        ),
      );
    }
  }
}

function lintKnowledgeConflicts(pages: PageInfo[], findings: LintFinding[]): void {
  for (const page of pages) {
    if (hasKnowledgeConflictHeading(page.body)) {
      findings.push(
        warning(
          "unresolved_knowledge_conflict",
          page.path,
          "Page contains an unresolved knowledge conflict section.",
        ),
      );
    }
  }
}

function hasKnowledgeConflictHeading(markdown: string): boolean {
  const headingPattern = /^##\s+(.+)$/gm;
  for (const match of markdown.matchAll(headingPattern)) {
    const heading = match[1]?.trim().toLowerCase();
    if (!heading) {
      continue;
    }
    if (heading.includes("conflict") || heading.includes("冲突")) {
      return true;
    }
  }
  return false;
}

function lintRawSources(vaultDir: string, findings: LintFinding[]): void {
  const rawDir = path.join(vaultDir, "raw");
  if (!existsSync(rawDir)) {
    return;
  }

  for (const filePath of listMarkdownFiles(rawDir)) {
    const relativePath = normalizePath(path.relative(vaultDir, filePath));
    const rawRelative = normalizePath(path.relative(rawDir, filePath));
    const expectedWikiPath = path.join(
      vaultDir,
      "wiki",
      "sources",
      rawRelative,
    );
    if (!existsSync(expectedWikiPath)) {
      findings.push(
        warning(
          "raw_without_source",
          relativePath,
          `Raw file has no source page at ${normalizePath(path.relative(vaultDir, expectedWikiPath))}.`,
        ),
      );
    }
  }
}

function listMarkdownFiles(rootDir: string): string[] {
  const files: string[] = [];

  function visit(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile() && isMarkdownFile(entry.name)) {
        files.push(entryPath);
      }
    }
  }

  visit(rootDir);
  return files.sort((a, b) => a.localeCompare(b));
}

function error(code: string, filePath: string, message: string): LintFinding {
  return { severity: "error", code, path: filePath, message };
}

function warning(code: string, filePath: string, message: string): LintFinding {
  return { severity: "warning", code, path: filePath, message };
}
