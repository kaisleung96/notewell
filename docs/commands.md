# Commands

## `notewell init [dir]`

Creates `raw/`, `wiki/`, `schema/`, `.notewell/`, starter wiki files, and schema
files. Existing files are skipped rather than overwritten.

## `notewell index [dir]`

Scans `wiki/**/*.md`, parses frontmatter, extracts wikilinks, builds backlinks,
and writes `.notewell/index.json`, `.notewell/backlinks.json`, and
`.notewell/manifest.json`.

## `notewell search "query" [dir]`

Reads `.notewell/index.json`, ranks candidate pages, and prints matching pages
with scores and reasons. The CLI returns evidence; the agent does synthesis.

## `notewell lint [dir]`

Checks missing or invalid metadata, broken wikilinks, orphan pages, and raw files
without matching `wiki/sources/` pages. Errors exit with code `1`; warnings do
not fail the command.

## `notewell log [--type type] "message" [dir]`

Appends a dated entry to `wiki/log.md`, such as:

```markdown
## [2026-04-27] note | Updated Compose performance notes
```

## `notewell doctor [dir]`

Checks core directories, required schema files, starter wiki files, and whether
`.notewell/index.json` is missing or stale.
