# Quickstart

## Create a Vault

```bash
notewell init ~/wiki
notewell index ~/wiki
notewell doctor ~/wiki
```

Markdown vault is the source of truth. The JSON index is always available after
`notewell index` and can be rebuilt from `wiki/**/*.md`.

## Daily Flow

1. Add or read source material in `raw/`.
2. Write durable pages in `wiki/`.
3. Link related pages with wikilinks.
4. Run `notewell index .`.
5. Run `notewell lint .`.
6. Use `notewell search "query" .` for agent retrieval.

MCP is optional. Embeddings are optional. Claude, OpenClaw, and Cursor can all
use the baseline workflow without extra services.
