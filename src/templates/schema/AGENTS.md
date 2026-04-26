# Notewell Agent Guide

Use this vault as a Markdown-first technical knowledge base.

- Baseline workflow: read Markdown, update `wiki/`, run `notewell index`, run
  `notewell lint` before completion.
- Treat `raw/` as read-only source material. `raw/` is read-only for agents
  unless the user explicitly asks to add a new source.
- Maintain durable knowledge in `wiki/`.
- Follow the process documents in `schema/`.
- Rebuild `.notewell/` with `notewell index` when generated cache files are stale.
- MCP is optional; do not require MCP tools for normal work.
- Embeddings are optional; never block baseline Markdown or JSON index workflows
  on an embeddings service.
