import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { doctorVault } from "../src/core/doctor.js";
import { buildIndex } from "../src/core/indexer.js";
import { initVault } from "../src/core/init.js";

const createdTempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "notewell-doctor-"));
  createdTempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of createdTempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("doctorVault", () => {
  test("fails when core directories are missing", () => {
    const checks = doctorVault(createTempDir());

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "directory:raw", status: "fail" }),
        expect.objectContaining({ name: "directory:wiki", status: "fail" }),
        expect.objectContaining({ name: "directory:schema", status: "fail" }),
        expect.objectContaining({ name: "directory:.notewell", status: "fail" }),
      ]),
    );
  });

  test("detects missing starter files and missing index", () => {
    const vaultDir = createTempDir();
    initVault(vaultDir);
    unlinkSync(path.join(vaultDir, "schema", "query.md"));
    unlinkSync(path.join(vaultDir, "wiki", "log.md"));

    const checks = doctorVault(vaultDir);

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "schema:query.md", status: "fail" }),
        expect.objectContaining({ name: "wiki:log.md", status: "fail" }),
        expect.objectContaining({ name: "index", status: "warn" }),
      ]),
    );
  });

  test("warns when the index is stale", () => {
    const vaultDir = createTempDir();
    initVault(vaultDir);
    mkdirSync(path.join(vaultDir, "wiki", "concepts"), { recursive: true });
    const pagePath = path.join(vaultDir, "wiki", "concepts", "state.md");
    writeFileSync(
      pagePath,
      `---
title: State
summary: State notes.
type: concept
tags: [state]
---

# State
`,
      "utf8",
    );
    buildIndex(vaultDir);
    appendFileSync(pagePath, "\nFresh edit.\n", "utf8");
    const future = new Date(Date.now() + 60_000);
    utimesSync(pagePath, future, future);

    const checks = doctorVault(vaultDir);

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "index", status: "warn" }),
      ]),
    );
  });
});
