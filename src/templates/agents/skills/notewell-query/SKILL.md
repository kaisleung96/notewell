---
name: notewell-query
description: Use when answering a question from a Notewell LLM wiki.
user-invocable: true
---

# Notewell Query

Search the vault before answering. Do not answer from model knowledge first.

Use this skill when the user asks a knowledge-base question, especially prompts
starting with `/query`, `query`, `查询`, `问知识库`, or natural-language requests
about "my notes", "past decisions", "previous notes", "the wiki", or "the
knowledge base".

## Retrieval Workflow

1. Read `AGENTS.md` and, when present, `CLAUDE.md`.
2. Identify the user's question and preserve the original wording.
3. Read `wiki/index.md` first. Use it to locate relevant sources, concepts,
   analyses, questions, playbooks, projects, and domain pages.
4. If `.notewell/index.json` is missing or stale, run `notewell index .` before
   relying on search.
5. Run `notewell query "<question>" .` or `notewell search "<question>" .` as a
   second retrieval pass.
6. Read the full content of the most relevant wiki pages. If the answer depends
   on source evidence, follow links to `wiki/sources/` and referenced `raw/`
   files.
7. Do not answer from page titles, search snippets, or model memory alone.

## Answering Rules

1. Answer from vault evidence first.
2. Cite wiki evidence with wikilinks such as `[[Page Title]]` or
   `[[wiki/concepts/example]]`.
3. For a paragraph based on one page, one wikilink in that paragraph is enough.
   Do not over-cite every sentence.
4. Quote exact source text with Markdown block quotes and name the source.
5. When a page search result includes referenced assets, list the relevant asset
   as supporting evidence if it helps answer or verify the question.
6. If no vault evidence is found, say:
   `本地知识库中未找到相关内容，以下为通用知识回答：`
   before adding any general model knowledge.
7. Never present a generic model answer as if it came from the vault.

## Durable Write Back

When the answer is valuable for future retrieval, ask whether to save it before
writing. Offer to file reusable answers under `wiki/questions/`, synthesized
analysis under `wiki/analyses/`, and repeatable procedures under
`wiki/playbooks/`.

If the user already asked to save, persist, write, or file the answer, write it
without asking again. Use frontmatter fields `title`, `type`, `summary`, `tags`,
`sources`, and `updated`, and add useful wikilinks so the page is not isolated.

## Completion

1. For meaningful query work, append a query entry to `wiki/log.md` or run
   `notewell log --type query "<short summary>" .`.
2. After any durable wiki write back, run `notewell index .`.
3. Run `notewell lint .` before completion when wiki files changed, and fix
   issues caused by the query.
4. Summarize pages read, whether anything was saved, and remaining uncertainty.
