import { buildIndex } from "./indexer.js";
import { searchIndex } from "./search.js";
import { flexSearchBackend } from "./backends/flexsearch.js";
import type { SearchResult } from "./types.js";

export interface SearchBackend {
  name: string;
  index(vaultDir: string): Promise<void>;
  search(vaultDir: string, query: string): Promise<SearchResult[]>;
}

export const defaultSearchBackend: SearchBackend = {
  name: "json-index",
  async index(vaultDir: string): Promise<void> {
    buildIndex(vaultDir);
  },
  async search(vaultDir: string, query: string): Promise<SearchResult[]> {
    return searchIndex(vaultDir, query);
  },
};

export function getSearchBackend(name = "json-index"): SearchBackend {
  if (name === "json-index") {
    return defaultSearchBackend;
  }
  if (name === "flexsearch") {
    return flexSearchBackend;
  }
  throw new Error(`Unknown search backend: ${name}`);
}
