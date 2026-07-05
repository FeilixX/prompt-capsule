<div align="center">

<img src="static/sprites/n78/hero.png" alt="Prompt Tape" width="620" />

# Prompt Tape · 提示词卡带

**Seal a long prompt into a short, plain-text link.**

Copy one link, hand it to your AI — it opens the link and runs. Short-lived by design.

### ▶ [Try it live — **n78.xyz**](https://n78.xyz)

**English** · [简体中文](README.zh-CN.md)

[![license](https://img.shields.io/badge/license-MIT-1c1a17)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![Bun](https://img.shields.io/badge/Bun-runtime-14151a?logo=bun&logoColor=white)](https://bun.sh/)
[![SQLite](https://img.shields.io/badge/SQLite-bun%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://bun.sh/docs/api/sqlite)

</div>

---

## Why

Long prompts are annoying to share. Pasting a 2,000-character instruction into a chat, a ticket, or another agent is clumsy and lossy.

Prompt Tape "records" a prompt onto a **tape** — a short link that serves the raw text as `text/plain`. A human copies one link; an AI agent fetches that link and reads the exact bytes. When the tape expires, the content is gone. That short life is the point: no growing pile of stale prompts.

## How it works

1. **Paste** your prompt — any length, any format.
2. **Record** it. You get a link like `n78.xyz/c/a8K2mQp9`.
3. **Hand it to your AI.** A `GET` on that link returns your prompt as plain text. Codex, Claude, 豆包, whatever — it opens and runs.

Every tape has two URLs:

| URL | For | Serves |
| --- | --- | --- |
| `…/c/{slug}` | machines | the raw prompt, `text/plain; charset=utf-8` |
| `…/view/{slug}` | humans | a page to read, copy, and delete it |

## Features

- **Plain text, agent-first.** `/c/{slug}` is a clean `text/plain` endpoint — no HTML, no JS, nothing to scrape.
- **Short-lived.** 1 hour / 1 day / 7 days, then auto-cleared. Not a database of forever-prompts.
- **Delete key.** Each tape gets a one-time delete token; only the holder can kill it early.
- **No accounts.** Anonymous create, rate-limited.
- **Private by default.** Content lives server-side, is never indexed (`noindex`), and is never used for training.
- **Bilingual UI** (中文 / English) with a one-click toggle.

## Tech

- [SvelteKit](https://svelte.dev/) (Svelte 5 runes) + `adapter-node`
- [Bun](https://bun.sh/) runtime, `bun:sqlite` for storage
- [Zod](https://zod.dev/) for input validation
- Optional [Microsoft Clarity](https://clarity.microsoft.com/) analytics — prompt content and delete tokens are masked, so nothing sensitive is ever uploaded

## Quickstart

```bash
bun install
cp .env.example .env      # defaults work for local
bun run dev               # → http://localhost:5173
```

Production:

```bash
bun run build             # adapter-node → build/
bun run start             # serves build/index.js
```

Checks:

```bash
bun test                  # unit + integration
bun run check             # svelte-check + types
BASE=http://localhost:5173 bun scripts/smoke.ts   # end-to-end
```

## HTTP API

**Create** a tape:

```bash
curl -X POST https://n78.xyz/api/capsules \
  -H 'content-type: application/json' \
  -d '{"content":"You are a senior code reviewer...","ttl_seconds":604800}'
```

```jsonc
{
  "slug": "a8K2mQp9",
  "url": "https://n78.xyz/c/a8K2mQp9",         // raw text/plain
  "view_url": "https://n78.xyz/view/a8K2mQp9",  // human page
  "expires_at": "2026-07-12T00:00:00.000Z",
  "delete_token": "…"                           // keep it to delete early
}
```

**Read** it — this is what an agent does:

```bash
curl https://n78.xyz/c/a8K2mQp9              # → your prompt, as text/plain
```

**Delete** it early:

```bash
curl -X POST https://n78.xyz/api/capsules/a8K2mQp9/delete \
  -H 'content-type: application/json' \
  -d '{"delete_token":"…"}'
```

## MCP

A remote [MCP](https://modelcontextprotocol.io) server is served at **`https://n78.xyz/mcp`** (Streamable HTTP, stateless). Add it to any MCP client (Claude, Cursor, …) — zero install, just the URL:

```json
{
  "mcpServers": {
    "prompt-tape": { "url": "https://n78.xyz/mcp" }
  }
}
```

Tools:

| Tool | Args | Returns |
|------|------|---------|
| `create_prompt_tape` | `content`, `title?`, `ttl_seconds?` | `view_url`, `raw_url`, `delete_token`, `expires_at`, `agent_text` |
| `read_prompt_tape` | `target` (slug or URL) | the capsule text |
| `delete_prompt_tape` | `slug`, `delete_token` | `deleted` |

Same contract as the HTTP API (`content` ≤ 16 KB, `ttl_seconds` ≤ 7 days). An installable Skill package that wraps this lives in [`skills/prompt-tape/`](skills/prompt-tape/) — install & usage guide at [n78.xyz/skill](https://n78.xyz/skill).

## Configuration

Everything is env-driven — see [`.env.example`](.env.example):

| Var | Default | What |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | `https://n78.xyz` | Canonical base for generated links |
| `ALLOWED_HOSTS` | `n78.xyz` | Hosts allowed to serve capsules |
| `CAPSULE_ROUTE_PREFIX` | `/c` | Path prefix for the raw endpoint |
| `MAX_CONTENT_BYTES` | `16384` | Max prompt size (UTF-8 bytes) |
| `DEFAULT_TTL_SECONDS` / `MAX_TTL_SECONDS` | `604800` | TTL, in seconds (7 days) |
| `SLUG_LENGTH` | `8` | Base62 slug length |
| `DB_PATH` | `./data/capsules.db` | SQLite file |

## License

[MIT](LICENSE). Do what you like; no warranty.
