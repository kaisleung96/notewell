import { readFileSync } from "node:fs";
import path from "node:path";

import type {
  AssetRecord,
  AssetSearchResult,
  IndexRecord,
  PageSearchResult,
  SearchResult,
  WikiIndex,
} from "./types.js";

export function searchIndex(vaultDir: string, query: string): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }

  const index = readIndex(vaultDir);
  const assetsByPageSlug = groupAssetsByPageSlug(index.assets);
  const pagesBySlug = new Map(index.pages.map((page) => [page.slug, page]));
  return [
    ...index.pages
      .map((page) => scorePage(vaultDir, page, terms, assetsByPageSlug))
      .filter((result): result is PageSearchResult => result !== null),
    ...index.assets
      .map((asset) => scoreAsset(asset, terms, pagesBySlug))
      .filter((result): result is AssetSearchResult => result !== null),
  ]
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

function readIndex(vaultDir: string): WikiIndex {
  const indexPath = path.join(vaultDir, ".notewell", "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as WikiIndex & {
    assets?: AssetRecord[];
  };
  return {
    ...index,
    assets: index.assets ?? [],
  };
}

function scorePage(
  vaultDir: string,
  page: IndexRecord,
  terms: string[],
  assetsByPageSlug: Map<string, AssetRecord[]>,
): PageSearchResult | null {
  let score = 0;
  const reasons: string[] = [];

  if (containsAll(page.title, terms)) {
    score += 100;
    reasons.push("title match");
  }
  if (page.tags.some((tag) => containsAll(tag, terms))) {
    score += 80;
    reasons.push("tag match");
  }
  if (containsAny(page.type, terms) || containsAny(page.domain, terms)) {
    score += 60;
    reasons.push("metadata match");
  }
  if (containsAll(page.summary, terms)) {
    score += 40;
    reasons.push("summary match");
  }
  if (bodyMatches(vaultDir, page, terms)) {
    score += 10;
    reasons.push("body match");
  }
  if (page.backlinks.length > 0) {
    score += Math.min(page.backlinks.length * 2, 10);
    reasons.push("backlink boost");
  }

  if (score === 0) {
    return null;
  }

  return {
    kind: "page",
    slug: page.slug,
    path: page.path,
    title: page.title,
    summary: page.summary,
    score,
    reasons,
    assets: assetsByPageSlug.get(page.slug) ?? [],
  };
}

function scoreAsset(
  asset: AssetRecord,
  terms: string[],
  pagesBySlug: Map<string, IndexRecord>,
): AssetSearchResult | null {
  let score = 0;
  const reasons: string[] = [];

  if (containsAll(asset.title, terms)) {
    score += 90;
    reasons.push("title match");
  }
  if (containsAll(asset.path, terms)) {
    score += 50;
    reasons.push("path match");
  }
  if (asset.references.some((reference) => containsAll(reference.label, terms))) {
    score += 80;
    reasons.push("label match");
  }

  const referencingPages = asset.referenced_by
    .map((slug) => pagesBySlug.get(slug))
    .filter((page): page is IndexRecord => page !== undefined);

  if (referencingPages.some((page) => containsAll(page.title, terms))) {
    score += 30;
    reasons.push("referencing page title match");
  }
  if (referencingPages.some((page) => containsAll(page.summary, terms))) {
    score += 20;
    reasons.push("referencing page summary match");
  }
  if (
    referencingPages.some((page) =>
      page.tags.some((tag) => containsAll(tag, terms)),
    )
  ) {
    score += 20;
    reasons.push("referencing page tag match");
  }
  if (score > 0 && asset.referenced_by.length > 0) {
    score += Math.min(asset.referenced_by.length * 3, 12);
    reasons.push("reference boost");
  }

  if (score === 0) {
    return null;
  }

  return {
    kind: "asset",
    path: asset.path,
    title: asset.title,
    asset_kind: asset.asset_kind,
    score,
    reasons,
    references: asset.references,
  };
}

function groupAssetsByPageSlug(assets: AssetRecord[]): Map<string, AssetRecord[]> {
  const assetsByPageSlug = new Map<string, AssetRecord[]>();
  for (const asset of assets) {
    for (const pageSlug of asset.referenced_by) {
      const pageAssets = assetsByPageSlug.get(pageSlug) ?? [];
      pageAssets.push(asset);
      assetsByPageSlug.set(pageSlug, pageAssets);
    }
  }
  return assetsByPageSlug;
}

function bodyMatches(
  vaultDir: string,
  page: IndexRecord,
  terms: string[],
): boolean {
  const body = readFileSync(path.join(vaultDir, page.path), "utf8");
  return containsAll(body, terms);
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function containsAll(value: string | null, terms: string[]): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return terms.every((term) => normalized.includes(term));
}

function containsAny(value: string | null, terms: string[]): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}
