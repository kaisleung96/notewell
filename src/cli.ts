#!/usr/bin/env node
/**
 * notewell CLI entry point.
 *
 * v0.1 only wires up `buildHelpText` and a stub dispatcher. Actual command
 * implementations land in later tasks (init, index, search, lint, log,
 * doctor).
 */

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { initVault, type AgentAdapter } from "./core/init.js";
import { runOnboarding } from "./core/onboard.js";
import {
  doctorOperation,
  indexOperation,
  lintOperation,
  logOperation,
  searchOperation,
} from "./core/operations.js";
import { getSearchBackend } from "./core/search-backend.js";
import type { AssetRecord, SearchResult } from "./core/types.js";

const VERSION = "0.0.1";
const SUPPORTED_AGENT_ADAPTERS = ["claude", "cursor", "codex"] as const;

const COMMANDS = [
  {
    name: "notewell init",
    summary: "Initialize a new vault (raw/, wiki/, .notewell/, root guides).",
  },
  {
    name: "notewell index",
    summary: "Rebuild the JSON index under .notewell/.",
  },
  {
    name: "notewell search",
    summary: "Search the JSON index and explain why each result matched.",
  },
  {
    name: "notewell query",
    summary: "Alias for search when answering knowledge-base questions.",
  },
  {
    name: "notewell onboard",
    summary: "Guide installation and vault initialization interactively.",
  },
  {
    name: "notewell lint",
    summary: "Check the vault for broken links, missing frontmatter, orphans.",
  },
  {
    name: "notewell log",
    summary: "Append a structured entry to wiki/log.md.",
  },
  {
    name: "notewell doctor",
    summary: "Verify directory structure, root guides, and index freshness.",
  },
] as const;

export function buildHelpText(): string {
  const longestName = COMMANDS.reduce(
    (max, cmd) => Math.max(max, cmd.name.length),
    0,
  );
  const lines: string[] = [
    `notewell v${VERSION} - a lightweight Markdown-first personal knowledge wiki`,
    "",
    "Usage:",
    "  notewell <command> [options] [path]",
    "",
    "Commands:",
  ];
  for (const cmd of COMMANDS) {
    lines.push(`  ${cmd.name.padEnd(longestName)}  ${cmd.summary}`);
  }
  lines.push(
    "",
    "Run a command without arguments to see its options (coming in later tasks).",
    "",
  );
  return lines.join("\n");
}

/**
 * Tiny dispatcher. Returns the intended process exit code.
 *
 * v0.1 prints help on no args and on unknown commands. Real command bodies
 * are added in Task 3 (init), Task 5 (index), Task 6 (search), Task 7 (lint),
 * Task 8 (log), Task 9 (doctor).
 */
export async function run(argv: string[]): Promise<number> {
  const [command] = argv;
  if (!command || command === "-h" || command === "--help") {
    process.stdout.write(`${buildHelpText()}\n`);
    return 0;
  }
  if (command === "-v" || command === "--version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const known = new Set(COMMANDS.map((c) => c.name.split(" ")[1]));
  if (!known.has(command)) {
    process.stderr.write(`notewell: unknown command "${command}"\n\n`);
    process.stdout.write(`${buildHelpText()}\n`);
    return 1;
  }

  if (command === "init") {
    const parsed = parseInitArgs(argv.slice(1));
    if (parsed.error) {
      process.stderr.write(`notewell: ${parsed.error}\n`);
      return 1;
    }
    const result = initVault(parsed.vaultDir, { agents: parsed.agents });
    process.stdout.write(
      `Initialized notewell vault at ${parsed.vaultDir}\n` +
        `Created: ${result.created.length}\n` +
        `Skipped: ${result.skipped.length}\n`,
    );
    return 0;
  }

  if (command === "onboard") {
    const parsed = parseOnboardArgs(argv.slice(1));
    if (parsed.error) {
      process.stderr.write(`notewell: ${parsed.error}\n`);
      return 1;
    }
    const result = await runOnboarding({
      yes: parsed.yes,
      agents: parsed.agents,
      ...(parsed.vaultDir ? { vaultDir: parsed.vaultDir } : {}),
    });
    if (result.cancelled) {
      process.stdout.write("Onboarding cancelled.\n");
      return 0;
    }
    process.stdout.write(
      `Initialized notewell vault at ${result.vaultDir}\n` +
        `Created: ${result.initResult?.created.length ?? 0}\n` +
        `Skipped: ${result.initResult?.skipped.length ?? 0}\n` +
        "\nNext steps:\n" +
        `  notewell index ${result.vaultDir}\n` +
        `  notewell doctor ${result.vaultDir}\n`,
    );
    return 0;
  }

  if (command === "index") {
    const { vaultDir, backend } = parseDirAndBackend(argv.slice(1));
    const index =
      backend === "json-index"
        ? indexOperation(vaultDir)
        : (await getSearchBackend(backend).index(vaultDir), indexOperation(vaultDir));
    process.stdout.write(
      `Indexed ${index.pages.length} pages into ${vaultDir}/.notewell\n`,
    );
    return 0;
  }

  if (command === "search" || command === "query") {
    const query = argv[1];
    if (!query) {
      process.stderr.write(`notewell: ${command} requires a query\n`);
      return 1;
    }
    const { vaultDir, backend } = parseDirAndBackend(argv.slice(2));
    const results =
      backend === "json-index"
        ? searchOperation(vaultDir, query)
        : await getSearchBackend(backend).search(vaultDir, query);
    for (const result of results) {
      for (const line of formatSearchResult(result)) {
        process.stdout.write(`${line}\n`);
      }
    }
    return 0;
  }

  if (command === "lint") {
    const vaultDir = argv[1] ?? process.cwd();
    const findings = lintOperation(vaultDir);
    for (const finding of findings) {
      process.stdout.write(
        `${finding.severity}\t${finding.code}\t${finding.path}\t${finding.message}\n`,
      );
    }
    return findings.some((finding) => finding.severity === "error") ? 1 : 0;
  }

  if (command === "log") {
    const parsed = parseLogArgs(argv.slice(1));
    if (!parsed.message) {
      process.stderr.write("notewell: log requires a message\n");
      return 1;
    }
    const entry = logOperation(
      parsed.vaultDir,
      parsed.message,
      parsed.type ? { type: parsed.type } : {},
    );
    process.stdout.write(entry);
    return 0;
  }

  if (command === "doctor") {
    const vaultDir = argv[1] ?? process.cwd();
    const checks = doctorOperation(vaultDir);
    for (const check of checks) {
      process.stdout.write(`${check.status}\t${check.name}\t${check.message}\n`);
    }
    return checks.some((check) => check.status === "fail") ? 1 : 0;
  }

  process.stderr.write(
    `notewell: command "${command}" is not implemented yet (v0.1 scaffold).\n`,
  );
  return 2;
}

function parseInitArgs(args: string[]): {
  agents: AgentAdapter[];
  vaultDir: string;
  error: string | null;
} {
  const agents: AgentAdapter[] = [];
  const remaining: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg !== "--agent") {
      remaining.push(arg);
      continue;
    }

    const agent = args[i + 1];
    if (!agent) {
      return {
        agents,
        vaultDir: remaining[0] ?? process.cwd(),
        error: "--agent requires a value",
      };
    }
    if (!isAgentAdapter(agent)) {
      return {
        agents,
        vaultDir: remaining[0] ?? process.cwd(),
        error: `unknown agent "${agent}"`,
      };
    }
    agents.push(agent);
    i += 1;
  }

  return {
    agents,
    vaultDir: remaining[0] ?? process.cwd(),
    error: null,
  };
}

function parseOnboardArgs(args: string[]): {
  agents: AgentAdapter[];
  vaultDir: string | undefined;
  yes: boolean;
  error: string | null;
} {
  const agents: AgentAdapter[] = [];
  const remaining: string[] = [];
  let yes = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--yes" || arg === "-y") {
      yes = true;
      continue;
    }
    if (arg !== "--agent") {
      remaining.push(arg);
      continue;
    }

    const agent = args[i + 1];
    if (!agent) {
      return { agents, vaultDir: remaining[0], yes, error: "--agent requires a value" };
    }
    if (!isAgentAdapter(agent)) {
      return { agents, vaultDir: remaining[0], yes, error: `unknown agent "${agent}"` };
    }
    agents.push(agent);
    i += 1;
  }

  return { agents, vaultDir: remaining[0], yes, error: null };
}

function isAgentAdapter(value: string): value is AgentAdapter {
  return SUPPORTED_AGENT_ADAPTERS.includes(value as AgentAdapter);
}

function isDirectInvocation(): boolean {
  if (typeof process.argv[1] !== "string") {
    return false;
  }
  try {
    const entryPath = realpathSync(process.argv[1]);
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    return entryPath === modulePath;
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(
        error instanceof Error ? `${error.message}\n` : `${String(error)}\n`,
      );
      process.exit(1);
    });
}

function parseLogArgs(args: string[]): {
  message: string | null;
  type: string | undefined;
  vaultDir: string;
} {
  let type: string | undefined;
  const remaining = [...args];
  if (remaining[0] === "--type") {
    type = remaining[1];
    remaining.splice(0, 2);
  }
  const message = remaining[0] ?? null;
  const vaultDir = remaining[1] ?? process.cwd();
  return { message, type, vaultDir };
}

function parseDirAndBackend(args: string[]): {
  vaultDir: string;
  backend: string;
} {
  let backend = "json-index";
  const remaining = [...args];
  const backendIndex = remaining.indexOf("--backend");
  if (backendIndex !== -1) {
    backend = remaining[backendIndex + 1] ?? "json-index";
    remaining.splice(backendIndex, 2);
  }
  return {
    vaultDir: remaining[0] ?? process.cwd(),
    backend,
  };
}

function formatSearchResult(result: SearchResult): string[] {
  const reasons = result.reasons.join(", ");
  if (result.kind === "asset") {
    return [`[asset] ${result.path}\t${result.score}\t${reasons}\t${result.title}`];
  }

  return [
    `[page] ${result.slug}\t${result.score}\t${reasons}\t${result.title}`,
    ...result.assets.map((asset) => formatPageAssetEvidence(result.slug, asset)),
  ];
}

function formatPageAssetEvidence(pageSlug: string, asset: AssetRecord): string {
  const reference =
    asset.references.find((candidate) => candidate.page_slug === pageSlug) ??
    asset.references[0];
  if (!reference) {
    return `  asset: ${asset.path}`;
  }

  const label = reference.label ? `: ${reference.label}` : "";
  return `  asset: ${asset.path} [${reference.reference_syntax}${label}]`;
}
