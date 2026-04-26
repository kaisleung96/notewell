# Ingestion

1. Add immutable source material under `raw/` only when asked. After creation,
   `raw/` is read-only.
2. Create or update a source summary under `wiki/sources/`.
3. Link durable concepts, playbooks, analyses, and open questions.
4. Update `wiki/log.md` with the ingestion note.
5. Run `notewell index` and run `notewell lint` before completion.
