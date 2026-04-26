# Android and AI Vault Examples

## Android performance article ingestion

1. Save the original article in `raw/articles/compose-performance.md`.
2. Create `wiki/sources/articles/compose-performance.md` with title, summary,
   tags, and links to concepts.
3. Add durable notes such as `wiki/concepts/recomposition.md` or
   `wiki/playbooks/compose-performance-triage.md`.
4. Run `notewell index .`, `notewell lint .`, and
   `notewell log --type ingest "Compose performance article" .`.

## AI paper ingestion

1. Store paper notes in `raw/papers/retrieval-augmented-generation.md`.
2. Summarize claims in `wiki/sources/papers/retrieval-augmented-generation.md`.
3. Link methods to `wiki/concepts/retrieval.md` and follow-up questions under
   `wiki/questions/rag-evaluation.md`.

## CS concept page

Create `wiki/concepts/cache-invalidation.md` with frontmatter, a short
definition, examples, and links to related analyses.

## Query write-back

When an agent answers a durable question, write back to the most useful layer:

- `wiki/questions/` for unresolved or recurring questions.
- `wiki/analyses/` for evidence-backed synthesis.
- `wiki/playbooks/` for repeatable troubleshooting or implementation steps.

Markdown vault is the source of truth. JSON index is always available after
indexing. MCP is optional. Embeddings are optional.
