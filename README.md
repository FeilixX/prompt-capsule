# 提示词胶囊 / Prompt Capsule

Prompt Capsule is a short-lived `text/plain` URL for long prompts and agent instructions.

它把小红书、X、教程文章里不适合直接展示的长 prompt / agent workflow 封装成一个短链接，例如:

```text
n78.xyz/c/abc123
```

人可以打开复制原文，Codex / Claude / Cursor 也可以直接读取这个 URL 并按内容执行。

## Product Direction

This repo is currently in product definition stage.

The core thesis is not "pastebin for prompts." It is an agent-native content primitive:

- creators publish a tiny URL instead of a fragile long prompt;
- readers get reliable plain text instead of screenshot OCR;
- agents can consume the same URL as an executable instruction packet;
- curated public capsules teach AI beginners that agents can read URLs and work from them.

## Key Docs

- [ROOT-v1.md](./ROOT-v1.md) - **canonical v1 root** (supersedes the Schoolhouse north-star)
- [PRD-prompt-capsule.md](./PRD-prompt-capsule.md) - backend contract input (URL / API / schema / deploy)
- [gstack-office-hours-agent-url-schoolhouse.md](./gstack-office-hours-agent-url-schoolhouse.md) - office-hours input; north-star **superseded by ROOT-v1**
- [hero-visual-research.md](./hero-visual-research.md) - visual research notes
- [hero-object-prompts.html](./hero-object-prompts.html) - hero object prompt exploration

## Current Decisions

- The product is a content primitive (a short `text/plain` URL humans copy and agents fetch+execute), not a prompt marketplace, community, or agent-literacy school.
- v1 proves one thing: **viral spread → someone uses it → willing to reuse (复购)**. Community/pool/curation defer until reuse is proven.
- `/c/{slug}` stays pure `text/plain; charset=utf-8`.
- Web utility path (`/new`, `/c`, `/view`) is must-ship; CLI / MCP / skill are fast-follow, not day-one blockers.
- Pool / moderation / 50 curated seeds are DEFERred, not v1 scope.
- Privacy language must be honest: anyone with the link can read it.

