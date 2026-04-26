# Version Roadmap

## 1.0 Contract

- Markdown vault is the source of truth.
- JSON index is always available.
- MCP is optional.
- Embeddings are optional.
- Optional backends supplement the JSON index; they do not replace it.
- Claude, OpenClaw, and Cursor use the same baseline command flow.

## Later Enhancements

- MCP transports can wrap the core operations.
- FlexSearch, SQLite, or embeddings can improve ranking when explicitly enabled.
- Agent workflows can add richer write-back conventions under `wiki/questions/`,
  `wiki/analyses/`, and `wiki/playbooks/`.
