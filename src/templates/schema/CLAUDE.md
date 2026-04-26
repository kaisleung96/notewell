# Claude Guide

Read `schema/AGENTS.md` first, then use the focused schema file for the task.

- Ingestion work follows `schema/ingestion.md`.
- Query answering follows `schema/query.md`.
- Cleanup and health checks follow `schema/maintenance.md`.
- Cursor, Claude, and OpenClaw should all use the same baseline workflow:
  Markdown source files, JSON index, lint, and explicit write back when durable
  knowledge changes.
- MCP is optional and embeddings are optional; prefer the baseline workflow when
  optional integrations are unavailable.
