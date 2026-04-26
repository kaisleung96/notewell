import { doctorVault } from "./doctor.js";
import { buildIndex } from "./indexer.js";
import { lintVault } from "./lint.js";
import { appendLogEntry, type AppendLogEntryOptions } from "./log.js";
import { searchIndex } from "./search.js";
import type { DoctorCheck, LintFinding, SearchResult, WikiIndex } from "./types.js";

export function indexOperation(vaultDir: string): WikiIndex {
  return buildIndex(vaultDir);
}

export function searchOperation(vaultDir: string, query: string): SearchResult[] {
  return searchIndex(vaultDir, query);
}

export function lintOperation(vaultDir: string): LintFinding[] {
  return lintVault(vaultDir);
}

export function doctorOperation(vaultDir: string): DoctorCheck[] {
  return doctorVault(vaultDir);
}

export function logOperation(
  vaultDir: string,
  message: string,
  options: AppendLogEntryOptions = {},
): string {
  return appendLogEntry(vaultDir, message, options);
}
