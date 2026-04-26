/**
 * notewell CLI entry point.
 *
 * v0.1 only wires up `buildHelpText` and a stub dispatcher. Actual command
 * implementations land in later tasks (init, index, search, lint, log,
 * doctor).
 */

import { fileURLToPath } from "node:url";
import process from "node:process";

import { doctorVault } from "./core/doctor.js";
import { buildIndex } from "./core/indexer.js";
import { initVault } from "./core/init.js";
import { lintVault } from "./core/lint.js";
import { appendLogEntry } from "./core/log.js";
import { searchIndex } from "./core/search.js";

const VERSION = "0.0.1";

const COMMANDS = [
  {
    name: "notewell init",
    summary: "Initialize a new vault (raw/, wiki/, schema/, .notewell/).",
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
    name: "notewell lint",
    summary: "Check the vault for broken links, missing frontmatter, orphans.",
  },
  {
    name: "notewell log",
    summary: "Append a structured entry to wiki/log.md.",
  },
  {
    name: "notewell doctor",
    summary: "Verify directory structure, schema files, and index freshness.",
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
export function run(argv: string[]): number {
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
    const vaultDir = argv[1] ?? process.cwd();
    const result = initVault(vaultDir);
    process.stdout.write(
      `Initialized notewell vault at ${vaultDir}\n` +
        `Created: ${result.created.length}\n` +
        `Skipped: ${result.skipped.length}\n`,
    );
    return 0;
  }

  if (command === "index") {
    const vaultDir = argv[1] ?? process.cwd();
    const index = buildIndex(vaultDir);
    process.stdout.write(
      `Indexed ${index.pages.length} pages into ${vaultDir}/.notewell\n`,
    );
    return 0;
  }

  if (command === "search") {
    const query = argv[1];
    if (!query) {
      process.stderr.write("notewell: search requires a query\n");
      return 1;
    }
    const vaultDir = argv[2] ?? process.cwd();
    const results = searchIndex(vaultDir, query);
    for (const result of results) {
      process.stdout.write(
        `${result.slug}\t${result.score}\t${result.reasons.join(", ")}\t${result.title}\n`,
      );
    }
    return 0;
  }

  if (command === "lint") {
    const vaultDir = argv[1] ?? process.cwd();
    const findings = lintVault(vaultDir);
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
    const entry = appendLogEntry(
      parsed.vaultDir,
      parsed.message,
      parsed.type ? { type: parsed.type } : {},
    );
    process.stdout.write(entry);
    return 0;
  }

  if (command === "doctor") {
    const vaultDir = argv[1] ?? process.cwd();
    const checks = doctorVault(vaultDir);
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

const isDirectInvocation =
  typeof process.argv[1] === "string" &&
  process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  const code = run(process.argv.slice(2));
  process.exit(code);
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
