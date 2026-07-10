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
- **Agent-native.** A remote MCP server and an installable Skill let an agent make, read, and delete tapes on its own.
- **Codes, not just links.** The URL tail *is* the tape's code. Share the bare code on platforms that downrank links; any agent with the Skill/MCP resolves it. Operators can also mint [**program codes**](#program-codes) — stable aliases that survive weekly renewals.
- **Short-lived.** 1 hour / 1 day / 7 days, then auto-cleared. Not a database of forever-prompts.
- **Optional moderation.** Publish-then-review via an out-of-band DeepSeek worker ([deploy/moderation.md](deploy/moderation.md)); a blocked tape reads as 404, as if it never existed.
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
  "slug": "a8K2mQp9",                           // = the tape's code
  "url": "https://n78.xyz/c/a8K2mQp9",         // raw text/plain
  "view_url": "https://n78.xyz/view/a8K2mQp9",  // human page
  "expires_at": "2026-07-12T00:00:00.000Z",
  "delete_token": "…",                          // keep it to delete early
  "code_share_text": "…",                       // URL-free share line (for link-downranking platforms)
  "agent_text": "…"                             // ready-made "fetch this and run it" line
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

## Use it from an agent

Point an agent at Prompt Tape and it makes tapes itself, then reads or deletes them. Two ways in, same backend.

### Remote MCP, zero install

A remote [MCP](https://modelcontextprotocol.io) server runs at **`https://n78.xyz/mcp`** (Streamable HTTP, stateless). Add one URL to Claude, Cursor, or any MCP client:

```json
{ "mcpServers": { "prompt-tape": { "url": "https://n78.xyz/mcp" } } }
```

Then ask your agent to seal a block of text into a tape, and it calls the tool.

| Tool | Args | Returns |
|------|------|---------|
| `create_prompt_tape` | `content`, `title?`, `ttl_seconds?` | `view_url`, `raw_url`, `code`, `code_share_text`, `delete_token`, `expires_at`, `agent_text` |
| `read_prompt_tape` | `target` (code, program code, or URL) | the tape's text |
| `delete_prompt_tape` | `slug`, `delete_token` | `deleted` |

### Skill, installable

[`skills/prompt-tape/`](skills/prompt-tape/) is a `SKILL.md` bundle for platforms that install Skills. It tells an agent when to offer a tape and how to make one, with three fallbacks: the MCP tool if it has one, otherwise the bundled `client.js` over HTTP, otherwise a nudge to the site. Upload the folder wherever your platform takes Skills.

Both share the HTTP API contract: `content` up to 16 KB, `ttl_seconds` up to 7 days. Full walkthrough at [n78.xyz/skill](https://n78.xyz/skill).

## Program codes

A tape dies in ≤ 7 days — that's the point. But a code printed in a long-lived post shouldn't rot with it. A **program code** is an operator-owned stable alias (say `CHIBI01`) that points at the *current* tape. Readers use it exactly like a tape code — `GET /c/CHIBI01`, case-insensitive, same everywhere the code works — and never notice the weekly swap underneath. Renewing mints a fresh tape with the same content and repoints the alias in one transaction; the old tape lives out its own clock, and a program you stop renewing goes "off air" within 7 days. The TTL contract on every individual tape is untouched.

The admin surface is Bearer-gated and **off by default** — with `ADMIN_TOKEN` empty, every `/api/programs*` route answers 404:

| Endpoint | Does |
|---|---|
| `PUT /api/programs/{name}` | create or repoint — body `{"slug":"…","note":"…"}` |
| `POST /api/programs/{name}/renew` | weekly swap: new tape, same content, alias repointed atomically |
| `GET /api/programs` | list programs with current expiry and lifetime hits |
| `DELETE /api/programs/{name}` | drop the alias; the current tape is untouched |

Weekly ops is one command:

```bash
ADMIN_TOKEN=… bun scripts/renew.ts CHIBI01   # prints the new expiry + ready-to-paste share text
```

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
| `ADMIN_TOKEN` | *(empty)* | Bearer token for `/api/programs*`. Empty = surface disabled (404); non-empty but < 32 bytes refuses to boot |
| `PUBLIC_ICP_FILING` | *(empty)* | CN ICP filing number for the footer, injected at runtime — never hardcode yours |
| `PUBLIC_CLARITY_ID` | *(empty)* | Microsoft Clarity project id, injected at runtime. Empty = analytics fully disabled; only ever loads on the exact `PUBLIC_BASE_URL` host |
| `MODERATION_*` / `DEEPSEEK_*` | *(disabled)* | Content-moderation worker knobs — see [deploy/moderation.md](deploy/moderation.md) |

## License

[MIT](LICENSE). Do what you like; no warranty.
