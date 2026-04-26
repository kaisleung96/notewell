import { readFileSync } from "node:fs";
import path from "node:path";

import type { IndexRecord, SearchResult, WikiIndex } from "./types.js";

export function searchIndex(vaultDir: string, query: string): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }

  const index = readIndex(vaultDir);
  return index.pages
    .map((page) => scorePage(vaultDir, page, terms))
    .filter((result): result is SearchResult => result !== null)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

function readIndex(vaultDir: string): WikiIndex {
  const indexPath = path.join(vaultDir, ".notewell", "index.json");
  return JSON.parse(readFileSync(indexPath, "utf8")) as WikiIndex;
}

function scorePage(
  vaultDir: string,
  page: IndexRecord,
  terms: string[],
): SearchResult | null {
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
    slug: page.slug,
    path: page.path,
    title: page.title,
    summary: page.summary,
    score,
    reasons,
  };
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
