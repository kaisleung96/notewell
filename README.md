# Notewell

Notewell is a lightweight Markdown-first personal technical knowledge base for
LLM-assisted maintenance. It keeps the source of truth in plain files that
Obsidian, Claude, OpenClaw, Cursor, and local scripts can all read.

## Layers

```text
raw/        Immutable source material.
wiki/       Durable synthesized knowledge.
schema/     Agent instructions and maintenance rules.
.notewell/  Rebuildable JSON cache.
```

The cache is derived. Delete `.notewell/` whenever you want; `notewell index`
rebuilds it from Markdown.

## 1.0 Guarantee

- Markdown vault is the source of truth.
- JSON index is always available through `.notewell/index.json`.
- MCP is optional.
- Embeddings are optional, including SQLite, FlexSearch, or vector services.
- Claude, OpenClaw, and Cursor can use the baseline workflow with only Markdown,
  `notewell index`, `notewell search`, `notewell lint`, and `notewell doctor`.

## Quickstart

```bash
npm install
npm run build
notewell init .
notewell index .
notewell search "compose performance" .
notewell lint .
notewell log --type note "Updated Compose notes" .
notewell doctor .
```

## Commands

- `notewell init [dir]`
- `notewell index [dir]`
- `notewell search "query" [dir]`
- `notewell lint [dir]`
- `notewell log [--type type] "message" [dir]`
- `notewell doctor [dir]`

MCP servers, embeddings, SQLite, and FlexSearch are optional future layers. The
baseline workflow only requires Markdown and JSON.
