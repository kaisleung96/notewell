---
name: notewell-lint
description: Use when reviewing or health-checking a Notewell LLM wiki.
user-invocable: true
---

# Notewell Lint

Use this skill when the user asks to lint, review, audit, or health-check the
wiki, especially prompts starting with `/lint`, `/scan`, `/health`, `检查知识库状态`,
or `检查健康`.

The goal is to bring static-analysis discipline to the knowledge graph: broken
links, orphan pages, stale index entries, unregistered pages, and unresolved
knowledge conflicts should be visible before they compound.

## Workflow

1. Locate the current vault and `wiki/` directory.
2. Read `wiki/index.md` and scan `wiki/**/*.md`.
3. Run `notewell lint .` and read every finding.
4. Report dead wikilinks, orphan pages, pages missing from `wiki/index.md`, stale
   `wiki/index.md` entries, invalid frontmatter, source gaps, and pages with
   `## 知识冲突`.
5. Treat `missing_asset_reference` as a warning that a wiki page points to an
   asset path that does not exist.
6. By default, stay read-only. Do not modify, delete, rename, or reclassify files
   while producing the health report.
7. Only fix issues after the user explicitly confirms the repair.

## Optional Inbox Checks

Default health checks focus on `wiki/`. If the user asks to inspect pending
ingestion work, also scan `raw/` while excluding `raw/09-archive/**`. Treat
unreferenced media assets as yellow-light findings only; never delete assets
automatically.

## Report Format

Use this structure:

```markdown
## 知识库健康体检报告 — YYYY-MM-DD

### 绿灯项
- [运行良好的项目]

### 黄灯项
- **发现 N 个孤儿页面**：[列表] - 建议添加关联或分类
- **发现 N 个未同步索引**：[列表] - 文件存在但未在 index.md 注册

### 红灯项
- **发现 N 个死链**：[来源页面] → [[不存在的目标页面]]
- **存在 N 个未解决的知识冲突**：[页面名称]

### 下一步行动
1. 是否需要自动修复未同步索引？
2. 是否需要针对知识冲突进行重新推演？
```

## Repair Rules

After confirmed fixes:

1. Preserve source attribution when resolving conflicts or stale claims.
2. Run `notewell index .` after durable wiki changes.
3. Run `notewell lint .` again before completion.
4. Log meaningful maintenance with `notewell log --type lint "<summary>" .`.
