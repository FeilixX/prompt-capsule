<div align="center">

<img src="static/sprites/n78/hero.png" alt="提示词卡带" width="620" />

# 提示词卡带 · Prompt Tape

**把一长段提示词，封成一条纯文本短链接。**

复制一条链接甩给你的 AI —— 它打开链接就照着跑。短命，是故意的。

### ▶ [在线试试 — **n78.xyz**](https://n78.xyz)

[English](README.md) · **简体中文**

[![license](https://img.shields.io/badge/license-MIT-1c1a17)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![Bun](https://img.shields.io/badge/Bun-runtime-14151a?logo=bun&logoColor=white)](https://bun.sh/)
[![SQLite](https://img.shields.io/badge/SQLite-bun%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://bun.sh/docs/api/sqlite)

</div>

---

## 为什么

长提示词分享起来很烦。把两千字的指令粘进聊天框、工单、或者另一个 agent，又笨又容易丢格式。

提示词卡带把一段提示词「录」成一盘**卡带** —— 一条短链接，直接以 `text/plain` 吐出原文。人复制一条链接；AI agent 拉这条链接，读到的就是一字不差的原文。卡带过期，内容就没了。短命正是重点：不留一堆过时提示词。

## 怎么用

1. **粘上**你的提示词 —— 多长都行，什么格式都认。
2. **录成一盘卡带**，拿到一条 `n78.xyz/c/a8K2mQp9` 这样的链接。
3. **甩给你的 AI。** 对这条链接发个 `GET`，返回的就是纯文本原文。Codex、Claude、豆包，随便谁 —— 打开就跑。

每盘卡带两个 URL：

| URL | 给谁 | 吐什么 |
| --- | --- | --- |
| `…/c/{slug}` | 机器 | 原始提示词，`text/plain; charset=utf-8` |
| `…/view/{slug}` | 人 | 一个能读、能复制、能删的页面 |

## 特性

- **纯文本，机器优先。** `/c/{slug}` 是干净的 `text/plain` 端点 —— 没 HTML、没 JS、没得爬。
- **短命。** 1 小时 / 1 天 / 7 天，到点自动清空。不是一个存到天荒地老的提示词库。
- **删除口令。** 每盘卡带一枚一次性删除口令；只有握着它的人能提前删掉。
- **不用注册。** 匿名创建，带限流。
- **默认私密。** 内容存服务端，不被搜索引擎收录（`noindex`），也不拿去训练。
- **开源可查。** 代码全在 GitHub —— 不信我们？自己读，自己跑一份。
- **双语界面**（中文 / English），一键切换。

## 技术栈

- [SvelteKit](https://svelte.dev/)（Svelte 5 runes）+ `adapter-node`
- [Bun](https://bun.sh/) 运行时，`bun:sqlite` 存储
- [Zod](https://zod.dev/) 校验输入
- 可选 [Microsoft Clarity](https://clarity.microsoft.com/) 统计 —— 提示词内容和删除口令都做了遮罩，敏感内容一个字都不上传

## 快速上手

```bash
bun install
cp .env.example .env      # 本地用默认值即可
bun run dev               # → http://localhost:5173
```

生产：

```bash
bun run build             # adapter-node → build/
bun run start             # 跑 build/index.js
```

检查：

```bash
bun test                  # 单元 + 集成
bun run check             # svelte-check + 类型
BASE=http://localhost:5173 bun scripts/smoke.ts   # 端到端
```

## HTTP API

**创建**一盘卡带：

```bash
curl -X POST https://n78.xyz/api/capsules \
  -H 'content-type: application/json' \
  -d '{"content":"你是一名资深代码审查员...","ttl_seconds":604800}'
```

```jsonc
{
  "slug": "a8K2mQp9",
  "url": "https://n78.xyz/c/a8K2mQp9",         // 原始 text/plain
  "view_url": "https://n78.xyz/view/a8K2mQp9",  // 人看的页面
  "expires_at": "2026-07-12T00:00:00.000Z",
  "delete_token": "…"                           // 存好它,用来提前删
}
```

**读取**（agent 就是这么干的）：

```bash
curl https://n78.xyz/c/a8K2mQp9              # → 你的提示词,纯文本
```

**提前删**：

```bash
curl -X POST https://n78.xyz/api/capsules/a8K2mQp9/delete \
  -H 'content-type: application/json' \
  -d '{"delete_token":"…"}'
```

## 用 MCP 接入

远程 [MCP](https://modelcontextprotocol.io) 服务挂在 **`https://n78.xyz/mcp`**(Streamable HTTP,无状态)。任何 MCP 客户端(Claude、Cursor 等)填一个 URL 即用,零安装：

```json
{
  "mcpServers": {
    "prompt-tape": { "url": "https://n78.xyz/mcp" }
  }
}
```

工具：

| 工具 | 参数 | 返回 |
|------|------|------|
| `create_prompt_tape` | `content`、`title?`、`ttl_seconds?` | `view_url`、`raw_url`、`delete_token`、`expires_at`、`agent_text` |
| `read_prompt_tape` | `target`(slug 或 URL) | 卡带正文 |
| `delete_prompt_tape` | `slug`、`delete_token` | `deleted` |

契约与 HTTP API 一致(`content` ≤ 16 KB,`ttl_seconds` ≤ 7 天)。封装成可安装 Skill 的包在 [`skills/prompt-tape/`](skills/prompt-tape/),安装与用法见 [n78.xyz/skill](https://n78.xyz/skill)。

## 配置

全走环境变量 —— 见 [`.env.example`](.env.example)：

| 变量 | 默认 | 含义 |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | `https://n78.xyz` | 生成链接的规范 base |
| `ALLOWED_HOSTS` | `n78.xyz` | 允许提供卡带的 host |
| `CAPSULE_ROUTE_PREFIX` | `/c` | 原始端点的路径前缀 |
| `MAX_CONTENT_BYTES` | `16384` | 提示词最大体积（UTF-8 字节）|
| `DEFAULT_TTL_SECONDS` / `MAX_TTL_SECONDS` | `604800` | 有效期，秒（7 天）|
| `SLUG_LENGTH` | `8` | base62 slug 长度 |
| `DB_PATH` | `./data/capsules.db` | SQLite 文件 |

## 许可

[MIT](LICENSE)。随便用；不担保。
