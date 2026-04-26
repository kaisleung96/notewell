# Agent Workflows

Notewell is designed for agents that can read and edit Markdown. Claude,
OpenClaw, Cursor, and similar tools should treat `schema/AGENTS.md` as the
entry point, then follow task-specific schema files.

## Ingestion

1. Put original material in `raw/`.
2. Write a source summary in `wiki/sources/`.
3. Link durable concepts, papers, playbooks, and analyses.
4. Run `notewell index .`.
5. Run `notewell lint .`.
6. Add a log entry with `notewell log --type ingest "Source title" .`.

## Query Answering

1. Search first with `notewell search "query" .`.
2. Read the returned wiki pages and cited raw sources.
3. Answer from evidence.
4. If the answer should persist, update `wiki/`.
5. Run `notewell index .` and `notewell lint .`.

## Maintenance

Use `notewell doctor .` to check required structure and stale indexes. Use
`notewell lint .` to find broken links, missing metadata, and raw files that
need source summaries.

## Optional Features

MCP, embeddings, SQLite, and FlexSearch can improve workflows later, but agents
must not require them. The baseline contract is Markdown plus deterministic JSON
cache files under `.notewell/`.
