# Notewell

[English README](README.md)

Notewell 是一个轻量的 Markdown-first 个人技术知识库 CLI，面向
LLM 辅助维护场景。它把普通 Markdown 文件作为唯一事实来源，让
Obsidian、Claude、OpenClaw、Cursor 和本地脚本都能直接读取和维护。

## 它解决什么问题

Notewell 帮你维护一个同时适合人类和编码 agent 使用的个人技术 wiki。
你可以把原始资料、沉淀后的知识和 agent 规则分层管理，再通过可重建的
JSON 缓存完成索引、搜索、lint 和 agent 工作流。

基础工作流不依赖数据库、MCP server、embedding 服务或特定编辑器。

## LLM Wiki 模式（理论架构）

Notewell 所面向的是 **LLM Wiki** 这类做法：与「只在上传后按问题检索片段」的
典型 RAG 不同，这里强调由模型**持续维护**一棵互链的 Markdown 知识树。wiki
是**可沉淀、可复利**的制品：每加入一批原始资料，就更新来源页、实体与综合结论，
矛盾与缺漏可显式记录，而不必在**每次**提问时从零拼接碎片。人负责选源、探索与
提问；模型承担摘要、归档与双链等体力活。更完整的动机、多领域例子与注意点见
Andrej Karpathy 的说明：  
[《LLM Wiki》(Gist)](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)。

![LLM Wiki 概念架构：Raw sources、Wiki 与 Schema（代理策略）](llm-wiki-architecture.png)

**原典中的三层结构** —（1）**Raw sources**：人筛选的、**不可变**的原始资料。
（2）**Wiki**：由模型主要编写与修订的 Markdown（摘要、实体、概念、索引等）；
人读、模型写。（3）**Schema / 代理策略**：ingest、query、维护 wiki 的约定与
工作流；在 Notewell 中对应仓库根的 `AGENTS.md`、`CLAUDE.md`，以及 `init` 时
生成的各 agent [Skills（见下文）](#agent-skills)。

**三类操作** — **Ingest**（`raw/` 新料驱动 `wiki/` 的页面与互链更新）、
**Query**（基于页面检索与引用回答；高价值回答可**写回**为新页）、
**Lint**（健康检查：过期论断、孤儿页、断链、待补全概念等）。**Index** 与
**Log** 在原文中强调：`wiki/index.md` 作内容向目录、查询前先读以导航；
`wiki/log.md` 作按时间追加的操作时间线。

Notewell 在 wiki 之外增加**派生**的 `.notewell/` JSON 索引，使
`notewell search`、lint 等可在本地、确定性地运行，不依赖 embedding；与 Gist
中「先用手写 index，规模大了再上搜索/工具」的思路一致，可按需接 MCP、向量
等增强。

## 目录分层

```text
raw/        不可变的原始资料；附件建议放在 raw/assets/。
wiki/       长期维护的结构化知识。
.notewell/  可重建的 JSON 缓存。
AGENTS.md   通用 Agent 指南。
CLAUDE.md   Claude 专用补充指南。
```

`.notewell/` 是派生缓存，可以删除；运行 `notewell index` 后会从
Markdown 重新生成。

## 引用资产

截图、架构图、PDF 等附件建议统一放在 `raw/assets/`。`notewell index`
只会把被 `wiki/**/*.md` 引用过的 assets 加入默认索引；未被 wiki 页面引用的
`raw/assets/` 文件仍只是原始资料，不会出现在默认搜索结果中。

引用可以使用 Obsidian 语法，例如
`![[raw/assets/diagram.png|架构图]]`，也可以使用标准 Markdown 语法，例如
`![架构图](../raw/assets/diagram.png)`。`notewell search` 和
`notewell query` 可能同时返回 `[page]` 与 `[asset]` 结果；当匹配页面引用了
相关资产时，page 结果可能附带 asset evidence。

## 环境要求

- Node.js 20 或更高版本
- npm

## 1.0 保证

- Markdown vault 是唯一事实来源。
- JSON index 始终可用，路径为 `.notewell/index.json`。
- MCP 是可选能力。
- Embeddings 是可选能力，包括 SQLite、FlexSearch 或向量服务。
- Claude、OpenClaw 和 Cursor 只依赖 Markdown、`notewell index`、
  `notewell search`、`notewell lint`、`notewell doctor` 就能使用基础工作流。

## 快速开始

**建议：**装好依赖并执行 `npm run build` 之后，优先运行 `notewell onboard`。
这是交互式安装与初始化：选择 vault 目录、要安装哪些 agent skills，并自动
完成与 `init` 等价的初始化；走完引导则不必再单独执行 `notewell init`。

使用 `node dist/cli.js` 时从项目根目录执行（包含 `package.json` 的目录）：

```bash
cd path/to/notewell-repo
npm install
npm run build
node dist/cli.js onboard ~/notewell-vault
```

同一 vault 路径下，后续可继续：

```bash
node dist/cli.js index ~/notewell-vault
node dist/cli.js search "compose performance" ~/notewell-vault
node dist/cli.js lint ~/notewell-vault
node dist/cli.js log --type note "Updated Compose notes" ~/notewell-vault
node dist/cli.js doctor ~/notewell-vault
```

**非交互方式：**若不需要向导，可改用 `notewell init`，并视需要加
`notewell init --agent <claude|cursor|codex>`，代替 `onboard`。

如果已经把包安装为命令行工具，可以用 `notewell` 替代
`node dist/cli.js`。

本地开发时，可以先 `npm link` 一次，然后在任意目录运行：

```bash
cd path/to/notewell-repo
npm install
npm run build
npm link
notewell onboard ~/notewell-vault
```

将 `path/to/notewell-repo` 替换为你本机克隆路径。

## 场景案例

`raw/` 与 `wiki/` 的分工可以套用在很多主题上。可以按项目拆多个 vault，也可以
一个生活/学习大库用子目录组织；**原始资料进 `raw/`，可长期维护的结论与笔记进
`wiki/`**，用双链把二者串起来。

**工作文档与项目知识库** — 把不便再逐字手改的导出物放在 `raw/`（合同与规范
PDF、工单长串、重要邮件、架构图、会议 slides 等）。在 `wiki/` 沉淀决策、操作
说明、playbook、事故复盘、项目内术语与实体说明（如 `wiki/playbooks/`、
`wiki/analyses/`，并对人、系统、票号用 `[[wiki/...]]` 互链）。`notewell index`
之后，用 `notewell search` 与 query 技能可以基于**你自己的**文本回答
「我们当时对 X 是怎么定的」，并给出 wiki 页级引用。

**读书笔记（书籍、论文、长文）** — 把原件放进 `raw/`，在 `wiki/sources/`
中按路径写或 ingest 与之一一对应的来源页，写清论点、关键主张与未决问题。把
读后综合、比较或金句式沉淀放在 `wiki/syntheses/`、`wiki/analyses/` 或各主题
`concept` 页，用双链从「你的评论」指回 `sources`，便于以后检索时串起原典与
理解。

**学习笔记与课程知识库** — 课程 PDF、实验讲义、作业要求等放入 `raw/`，在
`wiki/` 建立概念表、速查、错题与自测疑问（`wiki/questions/` 等），用双链把
每节课指向前置知识与后续拓展。`notewell index` 后，可按主题做复习与查漏补缺。

## 命令说明

- `notewell init [dir]`：创建 `raw/`、`wiki/`、`.notewell/`、根目录
  Agent 指南和初始模板；不会覆盖已有文件。
- `notewell onboard [dir]`：通过交互式引导选择目标目录和 agent skills；
  使用 `--yes` 可按默认值执行。
- `notewell init --agent claude [dir]`：额外生成 Claude 可用的 Notewell
  ingest、query、lint Skills。
- `notewell init --agent cursor [dir]`：额外生成 Cursor 可用的 Notewell
  ingest、query、lint Skills。
- `notewell init --agent codex [dir]`：额外生成 Codex 可用的 Notewell
  ingest、query、lint Skills。
- `notewell index [dir]`：扫描 `wiki/**/*.md`，解析 frontmatter，提取
  wikilinks 和 referenced assets，构建 backlinks，并写入 JSON 缓存。
- `notewell search "query" [dir]`：读取 `.notewell/index.json`，输出带分数、
  匹配原因的 `[page]` 与 `[asset]` 结果；page 结果在相关时会附带 asset evidence。
- `notewell query "query" [dir]`：`notewell search` 的别名，用于回答知识库问题。
- `notewell lint [dir]`：检查无效 frontmatter、缺失元数据、断开的 wikilink、
  孤立页面，以及没有对应 source page 的 raw 文件。
- `notewell log [--type type] "message" [dir]`：向 `wiki/log.md` 追加带日期的日志。
- `notewell doctor [dir]`：检查核心目录、根目录指南、wiki 初始文件和索引新鲜度。

## 推荐工作流

1. 把原始资料放到 `raw/`，附件建议放在 `raw/assets/`。
2. 在 `wiki/` 中维护长期有用的总结、概念、分析、问题和 playbook。
3. 使用 wikilink 连接相关页面，例如 `[[wiki/concepts/recomposition]]`。
4. 运行 `notewell index .`。
5. 运行 `notewell lint .`。
6. Agent 需要检索上下文时，运行 `notewell search "query" .`。
7. 重要变更使用 `notewell log --type note "message" .` 记录。

## Agent Skills

Skills 是 coding agent 的首选入口。CLI 命令是 Skills 可以调用的辅助工具，
用于索引、搜索、lint 和日志记录。

`--agent` 可以重复使用，所以一个 vault 可以同时支持多个工具：

```bash
notewell init --agent claude --agent cursor --agent codex ~/notewell-vault
```

每个被选择的 adapter 都会生成完整的 `notewell-ingest`、`notewell-query`
和 `notewell-lint` Skills。`notewell-query` 包含硬规则：Search the vault
before answering。

## Frontmatter

Wiki 页面应包含 frontmatter：

```markdown
---
title: Recomposition
type: concept
summary: Compose recomposition updates UI when state changes.
tags: [android, performance]
updated: 2026-04-27
---
```

`title`、`summary` 和 `tags` 是 lint 检查要求的字段。

## 可选能力

MCP server、embeddings、SQLite 和 FlexSearch 都是可选增强。基础工作流只需要
Markdown 和 JSON。

当前已包含可选 backend hook，可以接受 `--backend flexsearch`；如果未来没有接入
真实高级 backend，它会回退到 JSON index search。

## 开发

```bash
npm install
npm test
npm run test:e2e
npm run build
```

## 更多文档

- `docs/commands.md`：命令参考
- `docs/quickstart.md`：快速设置
- `docs/agent-workflows.md`：Claude、OpenClaw 和 Cursor 工作流
- `docs/obsidian.md`：Obsidian 设置说明
- `docs/search-backends.md`：搜索 backend 行为
- `docs/mcp.md`：可选 MCP 集成说明
