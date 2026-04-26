# Optional MCP Server

notewell keeps MCP optional. The baseline workflow is Markdown files plus the
JSON cache in `.notewell/`, so `notewell init`, `index`, `search`, `lint`,
`log`, and `doctor` work without MCP configuration or MCP dependencies.

The MCP integration exposes the same core operations for agents:

- `index` rebuilds `.notewell/index.json`.
- `search` queries the JSON index.
- `lint` reports structural findings.
- `doctor` checks vault setup and cache freshness.
- `append_log` writes to `wiki/log.md`.

The current server module exports tool definitions and handlers that can be
adapted to an MCP SDK transport. If MCP startup fails, continue using the CLI;
the vault source of truth and JSON index are unchanged.
