# Notewell

[中文说明](README.zh-CN.md)

Notewell is a lightweight Markdown-first personal technical knowledge base for
LLM-assisted maintenance. It keeps the source of truth in plain files that
Obsidian, Claude, OpenClaw, Cursor, and local scripts can all read.

## What It Does

Notewell helps you maintain a personal technical wiki that is easy for both
humans and coding agents to use. You write normal Markdown files, keep source
material separate from synthesized notes, and rebuild a deterministic JSON cache
for search, linting, and agent workflows.

The baseline workflow has no required database, MCP server, embedding service,
or proprietary editor dependency.

## The LLM Wiki pattern

Notewell follows the **LLM Wiki** idea: a personal knowledge base where the model
*incrementally maintains* an interlinked Markdown tree, rather than only
retrieving source chunks at query time (typical RAG). The wiki is a **persistent,
compounding artifact**—after each new source, cross-links, entity pages, and
syntheses can be updated so knowledge **accumulates**; contradictions and gaps can
be tracked instead of re-derived on every question. The human curates sources and
steers; the model does the heavy summarizing, filing, and cross-referencing. Full
background and examples (research, reading, business, and more) are in Andrej
Karpathy’s note:  
[“LLM Wiki” (Gist)](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

![LLM Wiki: raw sources, the wiki, and the schema (agent policy)](llm-wiki-architecture.png)

**Architecture in the pattern** — (1) **Raw sources**: immutable, curated files.  
(2) **The wiki**: LLM-edited Markdown (summaries, entities, concepts, index).  
(3) **The schema / agent policy**: how to ingest, query, and maintain; in
Notewell this is `AGENTS.md`, `CLAUDE.md`, and the generated
[agent skills](#agent-skills).

**Operations** — **Ingest** (new material in `raw/` updates `wiki/`), **query**
(search and cite wiki pages; good answers can be written back as pages), **lint**
(health: stale claims, orphans, missing links). The pattern also highlights
`wiki/index.md` as the content catalog to read first, and `wiki/log.md` as an
append-only timeline.

Notewell adds a **derived** JSON index under `.notewell/` so search and checks are
fast and offline; see [Layers](#layers) below. Optional tooling (MCP, embeddings,
external search) stays optional, as in the Gist’s “pick what you need” spirit.

## Layers

```text
raw/        Immutable source material. Put attachments in raw/assets/.
wiki/       Durable synthesized knowledge.
.notewell/  Rebuildable JSON cache.
AGENTS.md   Shared agent guidance.
CLAUDE.md   Claude-specific guidance.
```

The cache is derived. Delete `.notewell/` whenever you want; `notewell index`
rebuilds it from Markdown.

## Referenced Assets

Store screenshots, diagrams, PDFs, and other attachments under `raw/assets/`.
`notewell index` only adds assets to the default index when they are referenced
from `wiki/**/*.md`; unrelated files in `raw/assets/` remain raw material until a
wiki page cites them.

Asset references can use Obsidian syntax such as
`![[raw/assets/diagram.png|Architecture diagram]]` or standard Markdown syntax
such as `![Architecture diagram](../raw/assets/diagram.png)`. `notewell search`
and `notewell query` may return both `[page]` and `[asset]` results. Page results
can include asset evidence when a matching page references relevant assets.

## Requirements

- Node.js 20 or newer
- npm

## 1.0 Guarantee

- Markdown vault is the source of truth.
- JSON index is always available through `.notewell/index.json`.
- MCP is optional.
- Embeddings are optional, including SQLite, FlexSearch, or vector services.
- Claude, OpenClaw, and Cursor can use the baseline workflow with only Markdown,
  `notewell index`, `notewell search`, `notewell lint`, and `notewell doctor`.

## Quickstart

**Recommended:** use `notewell onboard` right after you install dependencies and
build. It is the interactive installer: you pick the vault path and which agent
skills to generate, and it initializes the vault for you. You do not need a
separate `notewell init` if you complete onboarding.

Run from the project root when using `node dist/cli.js` (the directory that
contains `package.json`):

```bash
cd path/to/notewell-repo
npm install
npm run build
node dist/cli.js onboard ~/notewell-vault
```

Then, with the same vault path:

```bash
node dist/cli.js index ~/notewell-vault
node dist/cli.js search "compose performance" ~/notewell-vault
node dist/cli.js lint ~/notewell-vault
node dist/cli.js log --type note "Updated Compose notes" ~/notewell-vault
node dist/cli.js doctor ~/notewell-vault
```

**Non-interactive:** to create a vault without the wizard, use
`notewell init` and optional `notewell init --agent <claude|cursor|codex>` instead
of `onboard`.

If the package is installed as a binary, use `notewell` instead of
`node dist/cli.js`.

For local development, you can link the CLI once and then run it from any
directory:

```bash
cd path/to/notewell-repo
npm install
npm run build
npm link
notewell onboard ~/notewell-vault
```

Replace `path/to/notewell-repo` with your own clone path.

## Scenario-based usage

The same `raw/` + `wiki/` split works for many domains. You can use one vault per
project or a single life vault with subfolders; keep immutable drops in `raw/`
and durable notes in `wiki/`, with wikilinks between them.

**Work and project documentation** — Store exports you do not want to hand-edit
(contracts, spec PDFs, tickets, long email threads, architecture diagrams, slide
decks) under `raw/`. Maintain decisions, how-tos, playbooks, incident postmortems,
and project glossaries in `wiki/` (for example `wiki/playbooks/`,
`wiki/analyses/`, and `[[wiki/...]]` links to people, systems, and tickets). After
`notewell index`, `notewell search` and the query skill can answer "what did we
decide about X" from your own text, with citations to wiki pages.

**Reading notes (books, papers, long articles)** — Add the original file to
`raw/` and write or ingest a `wiki/sources/...` page that mirrors the path,
capturing thesis, key claims, and open questions. Link syntheses, comparisons,
or quotes in `wiki/syntheses/`, `wiki/analyses/`, or topic concepts so a later
search chains sources to your commentary.

**Learning and course notes** — Put course PDFs, lab handouts, and assignment
prompts in `raw/`, then build concept pages, cheat sheets, and question or flashcard
notes in `wiki/`, with `[[wikilinks]]` from a lesson to prerequisites and
follow-ups. Use `wiki/questions/` (or a similar area) to track what you still
need to close the loop on; `notewell index` makes review sessions searchable by
topic.

## Commands

- `notewell init [dir]`: create `raw/`, `wiki/`, `.notewell/`, root agent
  guides, and starter templates without overwriting existing files.
- `notewell onboard [dir]`: guide vault initialization with an interactive
  prompt for the target path and agent skills. Use `--yes` for defaults.
- `notewell init --agent claude [dir]`: also create Claude skills for the
  Notewell ingest, query, and lint workflows.
- `notewell init --agent cursor [dir]`: also create Cursor skills for the
  Notewell ingest, query, and lint workflows.
- `notewell init --agent codex [dir]`: also create Codex skills for the
  Notewell ingest, query, and lint workflows.
- `notewell index [dir]`: scan `wiki/**/*.md`, parse frontmatter, extract
  wikilinks and referenced assets, build backlinks, and write JSON cache files.
- `notewell search "query" [dir]`: search `.notewell/index.json` and print
  ranked `[page]` and `[asset]` matches with scores, reasons, and asset evidence
  on page results when relevant.
- `notewell query "query" [dir]`: alias for `notewell search` when answering
  knowledge-base questions.
- `notewell lint [dir]`: report invalid frontmatter, missing required metadata,
  broken wikilinks, orphan pages, and raw files without source pages.
- `notewell log [--type type] "message" [dir]`: append a dated entry to
  `wiki/log.md`.
- `notewell doctor [dir]`: check required folders, root guide files, wiki
  starter files, and index freshness.

## Recommended Workflow

1. Put original material in `raw/`, with attachments in `raw/assets/`.
2. Write durable summaries, concepts, analyses, questions, and playbooks in
   `wiki/`.
3. Link related notes with wikilinks such as
   `[[wiki/concepts/recomposition]]`.
4. Run `notewell index .`.
5. Run `notewell lint .`.
6. Use `notewell search "query" .` when an agent needs retrieval context.
7. Record meaningful changes with `notewell log --type note "message" .`.

## Agent Skills

Skills are the preferred entry point for coding agents. CLI commands are helper
tools that skills can call for indexing, search, linting, and logging.

`--agent` is repeatable, so a vault can support multiple tools:

```bash
notewell init --agent claude --agent cursor --agent codex ~/notewell-vault
```

Each selected adapter gets complete `notewell-ingest`, `notewell-query`, and
`notewell-lint` skills. `notewell-query` includes the hard rule: Search the
vault before answering.

## Frontmatter

Wiki pages should include frontmatter:

```markdown
---
title: Recomposition
type: concept
summary: Compose recomposition updates UI when state changes.
tags: [android, performance]
updated: 2026-04-27
---
```

`title`, `summary`, and `tags` are required by lint checks.

## Optional Features

MCP servers, embeddings, SQLite, and FlexSearch are optional future layers. The
baseline workflow only requires Markdown and JSON.

The included optional backend hook can accept `--backend flexsearch`, but it
falls back to JSON index search unless a future package wires in the actual
advanced backend.

## Development

```bash
npm install
npm test
npm run test:e2e
npm run build
```

## More Documentation

- `docs/commands.md`: command reference
- `docs/quickstart.md`: short setup guide
- `docs/agent-workflows.md`: Claude, OpenClaw, and Cursor workflows
- `docs/obsidian.md`: Obsidian setup notes
- `docs/search-backends.md`: search backend behavior
- `docs/mcp.md`: optional MCP integration notes
