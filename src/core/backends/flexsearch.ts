import {
  defaultSearchBackend,
  type SearchBackend,
} from "../search-backend.js";
import type { SearchResult } from "../types.js";

export const flexSearchBackend: SearchBackend = {
  name: "flexsearch",
  async index(vaultDir: string): Promise<void> {
    await defaultSearchBackend.index(vaultDir);
  },
  async search(vaultDir: string, query: string): Promise<SearchResult[]> {
    const results = await defaultSearchBackend.search(vaultDir, query);
    return results.map((result) => ({
      ...result,
      reasons: [...result.reasons, "json backend fallback"],
    }));
  },
};
