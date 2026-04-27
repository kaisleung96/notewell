import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { parseMarkdown } from "./frontmatter.js";
import { isMarkdownFile, normalizePath, slugFromWikiPath } from "./paths.js";
import type {
  AssetKind,
  AssetRecord,
  AssetReference,
  AssetReferenceSyntax,
  IndexRecord,
  WikiIndex,
} from "./types.js";

export function buildIndex(vaultDir: string): WikiIndex {
  const generatedAt = new Date().toISOString();
  const wikiDir = path.join(vaultDir, "wiki");
  const markdownFiles = listMarkdownFiles(wikiDir);
  const records = markdownFiles.map((filePath) =>
    buildRecord(vaultDir, filePath),
  );
  const backlinks = buildBacklinks(records);
  const pages = records.map((record) => ({
    ...record,
    backlinks: backlinks[record.slug] ?? [],
  }));
  pages.sort((a, b) => a.path.localeCompare(b.path));
  const assets = buildAssetRecords(vaultDir, pages);

  const index: WikiIndex = {
    pages,
    assets,
    generated_at: generatedAt,
  };

  writeCache(vaultDir, index, backlinks, generatedAt);
  return index;
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

function buildRecord(vaultDir: string, filePath: string): IndexRecord {
  const content = readFileSync(filePath, "utf8");
  const parsed = parseMarkdown(content);
  const relativePath = normalizePath(path.relative(vaultDir, filePath));
  const stats = statSync(filePath);

  return {
    slug: slugFromWikiPath(relativePath),
    path: relativePath,
    title: parsed.title ?? titleFromPath(relativePath),
    summary: parsed.summary,
    type: stringField(parsed.frontmatter.type),
    domain: stringField(parsed.frontmatter.domain),
    tags: parsed.tags,
    links: extractWikiLinksForPage(parsed.body, relativePath),
    backlinks: [],
    updated_at:
      stringField(parsed.frontmatter.updated_at) ??
      stringField(parsed.frontmatter.updated) ??
      stats.mtime.toISOString(),
    hash: createHash("sha256").update(content).digest("hex"),
  };
}

function buildBacklinks(records: IndexRecord[]): Record<string, string[]> {
  const backlinks: Record<string, string[]> = {};
  for (const record of records) {
    for (const link of record.links) {
      backlinks[link] ??= [];
      backlinks[link].push(record.slug);
    }
  }

  for (const linkedFrom of Object.values(backlinks)) {
    linkedFrom.sort((a, b) => a.localeCompare(b));
  }

  return backlinks;
}

export function extractWikiLinks(markdown: string, pagePath?: string): string[] {
  return extractWikiLinksForPage(markdown, pagePath);
}

function extractWikiLinksForPage(markdown: string, pagePath?: string): string[] {
  const links = new Set<string>();
  const pattern = /\[\[([^\]]+)\]\]/g;
  for (const match of markdown.matchAll(pattern)) {
    const rawTarget = match[1];
    if (!rawTarget) {
      continue;
    }
    const target = rawTarget.split("|")[0]?.split("#")[0]?.trim();
    if (!target) {
      continue;
    }
    const normalizedTarget = normalizePath(target);
    if (isAssetWikiTarget(normalizedTarget, pagePath)) {
      continue;
    }
    links.add(slugFromWikiPath(normalizedTarget));
  }
  return [...links].sort((a, b) => a.localeCompare(b));
}

function isAssetWikiTarget(target: string, pagePath?: string): boolean {
  if (target.startsWith("raw/assets/")) {
    return true;
  }
  return pagePath ? resolveAssetPath(pagePath, target) !== null : false;
}

export type ExtractedAssetReference = AssetReference & {
  asset_path: string;
};

function buildAssetRecords(
  vaultDir: string,
  pages: IndexRecord[],
): AssetRecord[] {
  const assets = new Map<string, AssetRecord>();

  for (const page of pages) {
    const markdown = readFileSync(path.join(vaultDir, page.path), "utf8");
    for (const reference of extractAssetReferences(markdown, page)) {
      const absoluteAssetPath = path.join(vaultDir, reference.asset_path);
      if (!existsSync(absoluteAssetPath) || !statSync(absoluteAssetPath).isFile()) {
        continue;
      }
      if (!isRealPathWithinAssetRoot(vaultDir, absoluteAssetPath)) {
        continue;
      }

      let asset = assets.get(reference.asset_path);
      if (!asset) {
        const extension = path.posix.extname(reference.asset_path).toLowerCase();
        asset = {
          path: reference.asset_path,
          title: path.posix.basename(reference.asset_path),
          asset_kind: assetKindFromExtension(extension),
          extension,
          hash: createHash("sha256")
            .update(readFileSync(absoluteAssetPath))
            .digest("hex"),
          referenced_by: [],
          references: [],
        };
        assets.set(reference.asset_path, asset);
      }

      if (!asset.referenced_by.includes(page.slug)) {
        asset.referenced_by.push(page.slug);
      }
      asset.references.push({
        page_slug: reference.page_slug,
        page_path: reference.page_path,
        reference_syntax: reference.reference_syntax,
        label: reference.label,
        raw_target: reference.raw_target,
      });
    }
  }

  for (const asset of assets.values()) {
    asset.referenced_by.sort((a, b) => a.localeCompare(b));
  }

  return [...assets.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function extractAssetReferences(
  markdown: string,
  page: Pick<IndexRecord, "path" | "slug">,
): ExtractedAssetReference[] {
  const references: ExtractedAssetReference[] = [];
  const obsidianPattern = /(!?)\[\[([^\]]+)\]\]/g;
  for (const match of markdown.matchAll(obsidianPattern)) {
    const rawLink = match[2];
    if (!rawLink) {
      continue;
    }
    const [rawTargetPart, labelPart] = rawLink.split("|");
    const rawTarget = rawTargetPart?.trim();
    if (!rawTarget) {
      continue;
    }
    addAssetReference(references, {
      page,
      rawTarget,
      label: labelPart?.trim() || null,
      syntax: match[1] === "!" ? "obsidian-embed" : "obsidian-wikilink",
    });
  }

  const markdownPattern = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(markdownPattern)) {
    const rawTarget = parseMarkdownDestination(match[3] ?? "");
    if (!rawTarget) {
      continue;
    }
    addAssetReference(references, {
      page,
      rawTarget,
      label: match[2]?.trim() || null,
      syntax: match[1] === "!" ? "markdown-image" : "markdown-link",
    });
  }

  return references;
}

function parseMarkdownDestination(rawTarget: string): string | null {
  const trimmed = rawTarget.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("<")) {
    const closingIndex = trimmed.indexOf(">");
    const destination = closingIndex === -1 ? "" : trimmed.slice(1, closingIndex);
    return destination.trim() || null;
  }

  const whitespaceIndex = trimmed.search(/\s/);
  return (whitespaceIndex === -1 ? trimmed : trimmed.slice(0, whitespaceIndex)) || null;
}

function addAssetReference(
  references: ExtractedAssetReference[],
  options: {
    page: Pick<IndexRecord, "path" | "slug">;
    rawTarget: string;
    label: string | null;
    syntax: AssetReferenceSyntax;
  },
): void {
  const assetPath = resolveAssetPath(options.page.path, options.rawTarget);
  if (!assetPath) {
    return;
  }

  references.push({
    asset_path: assetPath,
    page_slug: options.page.slug,
    page_path: options.page.path,
    reference_syntax: options.syntax,
    label: options.label,
    raw_target: options.rawTarget,
  });
}

function resolveAssetPath(pagePath: string, rawTarget: string): string | null {
  if (isExternalOrAnchorTarget(rawTarget)) {
    return null;
  }

  const targetWithoutAnchor = rawTarget.split("#")[0]?.trim();
  if (!targetWithoutAnchor) {
    return null;
  }

  const normalizedTarget = normalizePath(targetWithoutAnchor);
  const candidate = normalizedTarget.startsWith("raw/assets/")
    ? path.posix.normalize(normalizedTarget)
    : path.posix.normalize(
        path.posix.join(path.posix.dirname(pagePath), normalizedTarget),
      );

  return candidate.startsWith("raw/assets/") ? candidate : null;
}

function isExternalOrAnchorTarget(rawTarget: string): boolean {
  return (
    rawTarget.startsWith("#") ||
    rawTarget.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
  );
}

function isRealPathWithinAssetRoot(
  vaultDir: string,
  absoluteAssetPath: string,
): boolean {
  const realAssetPath = realpathSync(absoluteAssetPath);
  const realAssetsDir = realpathSync(path.join(vaultDir, "raw", "assets"));
  const relativeRealPath = path.relative(realAssetsDir, realAssetPath);
  return (
    relativeRealPath === "" ||
    (!relativeRealPath.startsWith("..") && !path.isAbsolute(relativeRealPath))
  );
}

function assetKindFromExtension(extension: string): AssetKind {
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(extension)) {
    return "image";
  }
  if (extension === ".pdf") {
    return "pdf";
  }
  if ([".doc", ".docx", ".txt", ".md"].includes(extension)) {
    return "document";
  }
  return "other";
}

function writeCache(
  vaultDir: string,
  index: WikiIndex,
  backlinks: Record<string, string[]>,
  generatedAt: string,
): void {
  const cacheDir = path.join(vaultDir, ".notewell");
  mkdirSync(cacheDir, { recursive: true });
  writeJson(path.join(cacheDir, "index.json"), index);
  writeJson(path.join(cacheDir, "backlinks.json"), backlinks);
  writeJson(path.join(cacheDir, "manifest.json"), {
    generated_at: generatedAt,
    page_count: index.pages.length,
    asset_count: index.assets.length,
  });
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function stringField(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function titleFromPath(filePath: string): string {
  const basename = path.posix.basename(slugFromWikiPath(filePath));
  return basename
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
