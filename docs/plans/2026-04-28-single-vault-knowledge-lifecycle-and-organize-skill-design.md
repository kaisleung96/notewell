# Single Vault Knowledge Lifecycle and Organize Skill Design

## Context

Notewell should avoid splitting users into many vault types. A growing knowledge
base becomes hard to manage when raw material, source summaries, durable
concepts, open questions, and reusable workflows are mixed together without a
lifecycle.

The design keeps one stable vault model and adds guidance plus an agent skill to
help users manage growth.

## Goals

- Keep a single Notewell vault structure for all scenarios.
- Use onboarding to generate scenario guidance, not separate vault types.
- Teach users how knowledge moves from raw capture to durable wiki pages.
- Add a `notewell-organize` skill that can plan raw file organization before
  ingestion.
- Require user confirmation before moving or renaming raw source files.

## Non-Goals

- Do not add multiple vault schemas such as reading vaults, diary vaults, or
  programmer-learning vaults.
- Do not add an automatic classifier, vector clustering, or background daemon.
- Do not let the organize skill move, rename, or delete files without approval.
- Do not change the baseline `raw/`, `wiki/`, `.notewell/` contract.

## Single Vault Model

The canonical vault remains:

```text
raw/          Original material and attachments.
wiki/         Durable synthesized knowledge.
.notewell/    Rebuildable JSON cache.
AGENTS.md     Shared agent workflow guidance.
CLAUDE.md     Claude-specific workflow guidance.
```

Recommended wiki areas stay conventional rather than mandatory:

```text
wiki/sources/     One source page per raw source.
wiki/concepts/    Reusable concepts.
wiki/analyses/    Cross-source synthesis and reasoning.
wiki/questions/   Open questions and unresolved gaps.
wiki/playbooks/   Repeatable procedures.
wiki/guides/      User-facing management guidance.
```

## Knowledge Lifecycle

Knowledge should move through explicit states:

```text
Capture -> Organize -> Ingest -> Distill -> Query -> Maintain
```

### Capture

New material enters `raw/inbox/` or another user-selected raw location. The goal
is fast capture without forcing perfect classification up front.

Examples include articles, PDFs, exported notes, book excerpts, interview notes,
daily journals, and loose snippets.

### Organize

`notewell-organize` scans raw material, especially `raw/inbox/`, and proposes a
stable directory plan. It may detect topics, source types, duplicated names, and
candidate target paths.

It does not silently mutate the vault. Any move or rename plan must be shown to
the user first.

### Ingest

`notewell-ingest` converts each selected raw file into a source page at:

```text
wiki/sources/<raw relative path>.md
```

Source pages summarize the source, preserve attribution, extract entities and
concepts, and link related wiki pages.

### Distill

Only durable, reusable knowledge is promoted beyond source pages:

- `wiki/concepts/` for reusable concepts.
- `wiki/analyses/` for synthesis across sources.
- `wiki/playbooks/` for repeatable procedures.
- `wiki/questions/` for unresolved issues.

This prevents every raw source from becoming a permanent top-level concept.

### Query

Agents answer by searching the vault first, reading returned wiki pages, and
following source links when evidence matters.

Good answers can become durable wiki pages after user approval.

### Maintain

After durable changes:

```bash
notewell index .
notewell lint .
notewell log --type note "..."
```

`wiki/index.md` remains the navigation map, and `wiki/log.md` remains the
timeline of maintenance work.

## Onboarding Guide Generation

`notewell onboard` should add one guide-selection prompt after the agent skill
prompt:

```text
Which knowledge management guide should be generated?
```

Initial options:

- General knowledge lifecycle guide.
- Programmer technical learning guide.
- Reading notes guide.
- Diary and reflection guide.
- Fragment knowledge guide.

These are not vault types. They only determine which user-facing guidance file is
created.

Recommended generated path:

```text
wiki/guides/knowledge-management.md
```

The guide should explain:

- What belongs in `raw/`.
- When to use `raw/inbox/`.
- How `wiki/sources/` relates to raw files.
- When to promote knowledge into concepts, analyses, questions, or playbooks.
- How to run organize, ingest, index, lint, query, and log workflows.
- Common anti-patterns, such as turning raw files into mutable working notes or
  creating too many folders before knowledge stabilizes.

If the user chooses a specialized guide, the file should still teach the same
lifecycle while using examples from that scenario.

## `notewell-organize` Skill

Add a fourth generated agent skill beside existing ingest, query, and lint
skills:

```text
notewell-organize
```

The skill handles raw material organization before ingestion.

Workflow:

1. Read `AGENTS.md` and `CLAUDE.md` when present.
2. Inspect `raw/`, with special attention to `raw/inbox/`.
3. Identify candidate groups by source type, topic, project, date, or domain.
4. Produce a proposed move/rename plan.
5. Ask the user to approve the plan before moving or renaming raw files.
6. After approved moves, warn that related `wiki/sources/<raw relative path>.md`
   pages may need to be created or updated.
7. Run `notewell lint .` to surface raw files without source pages.
8. Log meaningful organization work with `notewell log --type organize "..." .`.

The skill may recommend follow-up ingestion, but it should not merge itself with
`notewell-ingest`.

## Error Handling and Safety

- Never delete raw files automatically.
- Never overwrite a destination path without explicit user approval.
- If a raw file already has a matching source page, moving the raw file requires
  a plan for the source page path impact.
- If duplicate candidate destinations exist, stop and ask the user.
- If the vault is missing required directories, recommend `notewell doctor .`
  before organizing.

## Testing Strategy

Add tests for:

- Onboarding prompt flow includes guide selection.
- `--yes` onboarding uses the default general guide.
- Initialization creates `wiki/guides/knowledge-management.md` when a guide is
  selected.
- Agent adapters receive `notewell-organize` skill files.
- Skill template tests assert the organize skill requires user confirmation
  before moving or renaming raw files.
- Docs smoke tests include the new guide and lifecycle language.

## Open Questions

- Should guide selection be single-select only, or should users be allowed to
  generate multiple guides?
- Should the guide choice be exposed on `notewell init` as a non-interactive flag
  such as `--guide general`?
- Should `wiki/guides/knowledge-management.md` be registered in `wiki/index.md`
  automatically?
