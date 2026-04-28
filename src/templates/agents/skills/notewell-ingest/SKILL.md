---
name: notewell-ingest
description: Use when ingesting source material into a Notewell LLM wiki.
---

# Notewell Ingest

Use this skill when the user asks to ingest, import, process, summarize, or file
source material into the vault.

The goal is to compile source material into the persistent wiki, not only to
summarize a document. A good ingest creates searchable, linked knowledge that a
human or LLM can use later.

## Before Writing

1. Read `AGENTS.md` and, when present, `CLAUDE.md`.
2. Confirm the ingestion scope. `/ingest` means scan eligible files under
   `raw/`; `/ingest <path>` means process only that path.
3. Treat implicit requests such as "ingest this into the knowledge base" or
   "import this article" as ingestion. Do not persist ordinary summaries unless
   the user asks.
4. Skip already-ingested raw files that have matching
   `wiki/sources/<raw relative path>.md` pages.
5. Treat `raw/` as immutable after source creation. Do not rewrite, move, or
   archive source files unless the user explicitly asks.

## Compile Each Source

For every selected source file:

1. Read the source before writing wiki content.
2. Extract the core thesis, durable facts, entities, concepts, uncertainty, and
   open questions.
3. Translate non-Chinese material into concise Simplified Chinese in wiki pages.
4. Preserve media assets in place. Link referenced assets with Obsidian syntax
   and explain how each asset relates to the knowledge point.
5. For important images and PDFs, add meaningful aliases, alt text, or link text
   so local search can find the asset without OCR.
6. Search or inspect existing wiki pages for related concepts before creating
   new pages.

## Write Wiki Pages

1. Create or update the source page at the mirror path
   `wiki/sources/<raw relative path>.md`.
2. Use frontmatter fields `title`, `type`, `summary`, `tags`, `sources`, and
   `updated`.
3. Make the source page useful on its own. Include a core summary, key points,
   entities and concepts, durable wikilinks, and open questions when relevant.
4. Create or update durable concept, analysis, question, playbook, or domain
   pages only when the source changes long-term knowledge.
5. Add source attribution and `## 关联连接` or an equivalent durable links
   section to every wiki page you create or expand.

## Conflict Handling

If new source content disagrees with an existing durable page, stop before
writing further synthesis. Report the affected page, old claim, new claim, and
source paths. Ask the user whether to keep both as a knowledge conflict, replace
the older claim, or abandon the ingest.

## Completion

1. Run `notewell index .` after durable wiki changes.
2. Run `notewell lint .` before completion and fix issues caused by this ingest.
3. Log meaningful ingests with `notewell log --type ingest "<source title>" .`.
4. Summarize created or updated pages, verification results, conflicts, and open
   questions.
