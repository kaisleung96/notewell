import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { isMarkdownFile } from "./paths.js";
import { requiredVaultDirs } from "./paths.js";
import type { DoctorCheck } from "./types.js";

const REQUIRED_SCHEMA_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "ingestion.md",
  "query.md",
  "maintenance.md",
  "taxonomy.md",
  "writing-style.md",
] as const;

const REQUIRED_WIKI_FILES = ["index.md", "log.md"] as const;

export function doctorVault(vaultDir: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  checkDirectories(vaultDir, checks);
  checkRequiredFiles(vaultDir, checks);
  checkIndexFreshness(vaultDir, checks);
  return checks;
}

function checkDirectories(vaultDir: string, checks: DoctorCheck[]): void {
  for (const dir of requiredVaultDirs()) {
    const target = path.join(vaultDir, dir);
    checks.push(
      existsSync(target) && statSync(target).isDirectory()
        ? ok(`directory:${dir}`, `${dir}/ exists.`)
        : fail(`directory:${dir}`, `${dir}/ is missing.`),
    );
  }
}

function checkRequiredFiles(vaultDir: string, checks: DoctorCheck[]): void {
  for (const file of REQUIRED_SCHEMA_FILES) {
    const target = path.join(vaultDir, "schema", file);
    checks.push(
      existsSync(target)
        ? ok(`schema:${file}`, `schema/${file} exists.`)
        : fail(`schema:${file}`, `schema/${file} is missing.`),
    );
  }

  for (const file of REQUIRED_WIKI_FILES) {
    const target = path.join(vaultDir, "wiki", file);
    checks.push(
      existsSync(target)
        ? ok(`wiki:${file}`, `wiki/${file} exists.`)
        : fail(`wiki:${file}`, `wiki/${file} is missing.`),
    );
  }
}

function checkIndexFreshness(vaultDir: string, checks: DoctorCheck[]): void {
  const indexPath = path.join(vaultDir, ".notewell", "index.json");
  if (!existsSync(indexPath)) {
    checks.push(warn("index", ".notewell/index.json is missing."));
    return;
  }

  const indexMtime = statSync(indexPath).mtimeMs;
  const latestWikiMtime = latestMarkdownMtime(path.join(vaultDir, "wiki"));
  if (latestWikiMtime > indexMtime) {
    checks.push(warn("index", ".notewell/index.json is older than wiki files."));
    return;
  }

  checks.push(ok("index", ".notewell/index.json is present and fresh."));
}

function latestMarkdownMtime(rootDir: string): number {
  if (!existsSync(rootDir)) {
    return 0;
  }

  let latest = 0;
  function visit(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile() && isMarkdownFile(entry.name)) {
        latest = Math.max(latest, statSync(entryPath).mtimeMs);
      }
    }
  }
  visit(rootDir);
  return latest;
}

function ok(name: string, message: string): DoctorCheck {
  return { name, status: "ok", message };
}

function warn(name: string, message: string): DoctorCheck {
  return { name, status: "warn", message };
}

function fail(name: string, message: string): DoctorCheck {
  return { name, status: "fail", message };
}
