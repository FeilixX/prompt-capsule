# PRD: 提示词胶囊 / Prompt Capsule

Date: 2026-07-03
Status: Draft
Mode: Approach B - product protocol first, first sharing flow at 95+

## 1. One-liner

提示词胶囊是给 AI 教程作者的可复制纯文本提示词链接: 把长 prompt / agent 指令 / vibe coding 步骤装进一个短 URL, 读者可以直接复制, 也可以让 Codex / Claude / Cursor 读取并执行。

English framing: Prompt Capsule is a short-lived `text/plain` URL for long prompts and agent instructions.

## 2. Why Now

The trigger is not an abstract market thesis. It came from a real 小红书 post:

- Prompt content in images and long captions is hard to reuse.
- A reader tried to extract text from a screenshot.
- Another reader suggested using 豆包 OCR to extract the prompt.
- The creator had to adjust the post so the prompt became copyable.

The narrow user workflow:

1. Creator posts AI howto / Codex / vibe coding content.
2. The useful instruction is too long or fragile for 小红书正文/图片.
3. Reader wants to reuse it, but copying fails or OCR introduces errors.
4. Creator shares a short text URL: `n78.xyz/c/abc123`.
5. Reader opens the URL and gets plain text.
6. Agent can also read the same URL and execute it.

This is a founder-led content artifact first. It does not need to prove a venture-scale market before being worth building. Building the 95-point artifact is itself the win because it supports the creator persona.

## 3. Product Positioning

### Brand

- Chinese brand: 提示词胶囊
- English brand: Prompt Capsule
- Object name: Capsule
- Technical name: `text/plain prompt URL`

### Small Red Book explanation

Use the functional explanation before the product noun:

> 提示词胶囊: 把长提示词装进一个纯文本链接, 发帖不折叠, 读者不用 OCR。

Short form:

> 提示词胶囊: 长提示词的可复制原文链接。

Avoid words that sound like traffic diversion:

- Do not say: 点击链接领取 / 跳转下载 / 外链获取
- Prefer: 指令原文 / 复制版 / 纯文本版 / 给 Codex 读取

Example post snippet:

```text
提示词胶囊: n78.xyz/c/abc123
给 Codex / Claude: 读取 n78.xyz/c/abc123 并按里面的步骤执行。
```

## 4. Target User

Primary user for v1:

- Felix himself, publishing 小红书 AI howto / Codex / vibe coding posts.
- Adjacent creators who publish long prompts, AI instructions, agent workflows, code snippets, or setup steps.

The first audience is not "all AI users". It is "AI tutorial creators who need their instructions to be reusable from a social feed."

## 5. Core Promise

For creators:

- Paste a long instruction once.
- Get a short URL and a ready-to-post 小红书 text snippet.
- Avoid comments asking for OCR, private messages, or corrected copies.
- Keep the content available only briefly by default.

For readers:

- Open the URL.
- See pure text.
- Copy reliably.
- Give the URL to an agent.

For agents:

- Fetch a stable `text/plain; charset=utf-8` endpoint.
- Treat the response as user-provided instruction content.
- Preserve line breaks, code fences, and exact wording.

## 6. Scope

### V1 must ship

- Web create page.
- Capsule text storage.
- Short random slug.
- `GET /c/{slug}` returns `text/plain`.
- Browser-friendly copy page or copy affordance without breaking the `text/plain` contract.
- TTL, default 7 days, max 7 days for anonymous capsules.
- Delete token after creation.
- 小红书 copy snippets.
- Open source repo shape from day one.
- CLI package plan.
- MCP server plan.
- Agent skill docs.

### V1 should not ship

- Prompt optimization / expansion.
- Prompt marketplace.
- User accounts.
- Paid storage.
- QR-code-first sharing.
- Callback flow.
- Comment ingestion.
- Social login.
- Permanent public archive.

Prompt optimization can come later, but it is not the urgent wedge. The urgent wedge is preserving exact reusable text.

## 7. 95-Point First Flow

The first flow must feel finished:

1. Creator lands on the page.
2. Creator sees a focused editor, not a marketing page.
3. Creator pastes a long prompt.
4. Creator chooses TTL, default 7 days.
5. Creator clicks "生成胶囊".
6. Creator gets:
   - capsule URL
   - 小红书文案
   - agent instruction text
   - delete URL/token
7. Reader opens capsule URL.
8. Reader sees exact plain text and can copy it.
9. Agent can fetch URL and follow the content.

No login, no dashboard, no onboarding tour.

## 8. URL Contract

Canonical text endpoint:

```text
GET /c/{slug}
Content-Type: text/plain; charset=utf-8
Cache-Control: no-store, no-cache, must-revalidate
X-Content-Type-Options: nosniff
```

Behavior:

- If active: return raw capsule content.
- If expired: return `410 Gone` with plain-text explanation.
- If not found: return `404 Not Found`.
- Do not wrap raw content in HTML at this endpoint.
- Preserve exact content bytes after UTF-8 normalization.

Optional HTML surface:

```text
GET /view/{slug}
```

Purpose:

- human-readable page
- copy button
- metadata
- expiration display

Do not make `/view/{slug}` the primary share link for agents. Agent share link is `/c/{slug}`.

## 9. API Contract

Create:

```http
POST /api/capsules
Content-Type: application/json
```

Request:

```json
{
  "title": "Codex 高频写入硬盘 bug 修复方法",
  "content": "帮我检查 ~/.codex/logs_2.sqlite 是否...",
  "ttl_seconds": 604800,
  "source": "web",
  "discovery_mode": "link_only"
}
```

Response:

```json
{
  "id": "cap_...",
  "slug": "a8K2mQp9",
  "url": "https://n78.xyz/c/a8K2mQp9",
  "view_url": "https://n78.xyz/view/a8K2mQp9",
  "expires_at": "2026-07-10T14:00:00Z",
  "discovery_mode": "link_only",
  "pool_status": "not_submitted",
  "delete_token": "del_...",
  "share_text": "提示词胶囊: n78.xyz/c/a8K2mQp9",
  "agent_text": "读取 n78.xyz/c/a8K2mQp9 并按里面的步骤执行。"
}
```

Delete:

```http
POST /api/capsules/{slug}/delete
```

Request:

```json
{
  "delete_token": "del_..."
}
```

## 10. Data Model

Table: `capsules`

```text
id                  text primary key
slug                text unique not null
title               text null
content             text not null
content_sha256      text not null
content_bytes       integer not null
created_at          timestamp not null
expires_at          timestamp not null
deleted_at          timestamp null
delete_token_hash   text not null
source              text not null  -- web | cli | mcp | api
discovery_mode      text not null default 'link_only'  -- link_only | pool_candidate
pool_status         text not null default 'not_submitted'  -- not_submitted | pending | eligible | featured | suppressed | expired
pool_tier           text null  -- seed | manual | community | fresh
moderation_status   text not null default 'pending'  -- pending | pass | review | block
quality_score       real null
pool_score          real null
created_ip_hash     text null
user_agent_hash     text null
view_count          integer not null default 0
copy_count          integer not null default 0
like_count          integer not null default 0
local_save_count    integer not null default 0
pool_impression_count integer not null default 0
pool_open_count     integer not null default 0
share_referral_count integer not null default 0
last_viewed_at      timestamp null
```

Optional table: `pool_entries`

```text
id                  text primary key
capsule_id          text not null references capsules(id)
tier                text not null  -- seed | manual | community
status              text not null  -- eligible | featured | suppressed | expired
featured_reason     text null
curator_note        text null
created_at          timestamp not null
featured_at         timestamp null
suppressed_at       timestamp null
```

Discovery semantics:

- `link_only`: the capsule is accessible by URL, but not submitted to the discoverable pool.
- `pool_candidate`: the capsule is accessible by URL and may be reviewed for the pool.
- The homepage/open-first pool is not a UGC firehose. V1 discoverable capsules must be curated seed entries or manually approved/high-signal community capsules.
- Deleting a capsule removes both the link content and any pool eligibility.

Default limits:

- Max content size: 16 KB for anonymous v1.
- Max TTL: 7 days.
- Slug: at least 8 random base62 chars; 10 chars preferred if public launch grows.

## 11. MCP Server

Distribution should follow the canonical npm/npx MCP pattern:

```bash
npx -y @prompt-capsule/mcp
```

The MCP server is a local stdio process that proxies to the hosted service.

Primitive-first v1 tools:

```text
capsule_create
capsule_get
capsule_delete
```

`capsule_create` input:

```json
{
  "title": "optional title",
  "content": "exact prompt content",
  "ttl_seconds": 604800,
  "idempotency_key": "optional client-generated key"
}
```

`capsule_create` output:

```json
{
  "url": "https://n78.xyz/c/a8K2mQp9",
  "expires_at": "2026-07-10T14:00:00Z",
  "share_text": "提示词胶囊: n78.xyz/c/a8K2mQp9",
  "agent_text": "读取 n78.xyz/c/a8K2mQp9 并按里面的步骤执行。"
}
```

Do not add feature-shaped tools like `create_xiaohongshu_prompt_post` in v1. Put platform-specific phrasing in the skill/playbook, not the MCP surface.

## 12. CLI

CLI should be the same npm package or sibling package:

```bash
npx -y @prompt-capsule/cli create prompt.md --ttl 7d
npx -y @prompt-capsule/cli create - --ttl 24h
```

Output:

```text
Capsule: https://n78.xyz/c/a8K2mQp9
Expires: 2026-07-10 22:00 +08:00

小红书:
提示词胶囊: n78.xyz/c/a8K2mQp9

Agent:
读取 n78.xyz/c/a8K2mQp9 并按里面的步骤执行。
```

## 13. Skill

The skill should teach agents:

- When user wants to share a long prompt publicly, create a capsule.
- Preserve exact wording unless explicitly asked to optimize.
- Ask for TTL only when it materially matters; default to 7 days.
- Return 小红书-ready copy.
- Warn that hosted capsules are not private or encrypted.

Trigger examples:

- "把这个 prompt 做成提示词胶囊"
- "我要发小红书, 这段太长了"
- "给我一个 Codex 能读取的纯文本链接"

## 14. Domain Strategy

### Recommendation

Use `n78.xyz` as the primary hosted and sharing domain. Do not block on buying a new global domain.

Reason:

- `n78.xyz` is already备案 and points to the 阿里云北京 ECS.
- 小红书 readers are domestic; China reach matters more than perfect English brand semantics for the first launch.
- Short URL format works well: `n78.xyz/c/abc123`.
- `promptcapsule.dev` is too long for social sharing. It reads as a docs/project domain, not a copyable post URL.
- Current content goal is creator-persona proof, not global SaaS launch.

### Brand/domain split

Keep "Prompt Capsule" as the open source brand, but do not require the first hosted domain to be `promptcapsule.*`.

Suggested split:

```text
Primary hosted/share:   n78.xyz
Open source brand:      Prompt Capsule / prompt-capsule
Future docs only:       promptcapsule.dev or promptcapsule.com, if available
NPM scope/package:      @prompt-capsule/mcp or prompt-capsule
GitHub repo:            prompt-capsule
```

### Multi-domain architecture requirement

Do not hard-code `n78.xyz`.

Config:

```text
PUBLIC_BASE_URL=https://n78.xyz
ALLOWED_HOSTS=n78.xyz,promptcapsule.dev
CAPSULE_ROUTE_PREFIX=/c
```

### Current availability check

As of 2026-07-03 local checks:

- `npm view prompt-capsule` returned 404.
- `npm view promptcapsule` returned 404.
- `npm view @prompt-capsule/mcp` returned 404.
- GitHub search did not show an exact strong `Prompt Capsule` / `prompt-capsule` collision.
- DNS `NS` lookup for `promptcapsule.com`, `promptcapsule.dev`, `promptcapsule.ai`, and `prompt-capsule.com` returned no NS records in local `dig` checks.

This is not a registrar guarantee. Before public brand lock, confirm availability in NameSilo / Cloudflare Registrar / Aliyun and buy the best semantic domain if cheap.

Future semantic domain priority, only for docs/brand pages, not primary share links:

1. `promptcapsule.dev` - acceptable for open source/tooling docs, but too long for capsules.
2. `promptcapsule.com` - acceptable for global brand pages if affordable, still too long for social sharing.
3. `promptcapsule.ai` - acceptable but more expensive and less neutral.
4. `prompt-capsule.com` - fallback; hyphen is worse for spoken sharing.

Do not replace `n78.xyz` with any of these as the canonical capsule URL unless a shorter, equally reliable global domain is acquired.

## 15. Web Product Design

### Design intent

This should not look like a generic SaaS landing page. First viewport is the tool.

Mood:

- precise
- utilitarian
- creator-tool
- slightly tactile because of "capsule"
- no loud hero gradient
- no giant marketing card
- no nested cards

Page structure:

1. Top bar: `提示词胶囊 Prompt Capsule`, minimal links: GitHub, API.
2. Main split:
   - left: editor
   - right: live output preview
3. Controls:
   - TTL segmented control: 1h / 24h / 7d
   - content byte counter
   - create button
4. Result state:
   - capsule URL
   - copy buttons
   - 小红书 snippet
   - agent snippet
   - expires at
   - delete link/token warning

Mobile:

- Editor first.
- Result becomes sticky bottom action after create.
- URL text must fit and be manually selectable.

### GPT Image 2 prompt for visual exploration

Use this prompt with `gpt-image-2` or equivalent design image generation:

```text
Design a high-fidelity web app screen for a Chinese + English creator tool called "提示词胶囊 / Prompt Capsule".

Product: a tool that turns long AI prompts and agent instructions into short-lived plain-text URLs for social sharing. The first screen is the actual tool, not a marketing landing page.

Audience: AI tutorial creators posting on Xiaohongshu, Codex / Claude / Cursor power users, open-source builders.

Canvas: desktop web app, 1440x1000.

Layout:
- restrained top navigation with brand "提示词胶囊 Prompt Capsule" on the left, GitHub and API links on the right.
- main workspace starts immediately under nav.
- left side: large prompt editor with realistic Chinese Codex instruction text, line numbers optional, byte counter, TTL segmented control (1h / 24h / 7d), primary button "生成胶囊".
- right side: result/preview area showing a short URL "n78.xyz/c/a8K2mQp9", copy buttons, "小红书文案", "给 Codex / Claude", expiration time, and a small plain-text preview.
- show the created state, not empty state.

Visual style:
- sophisticated utilitarian tool, not SaaS marketing.
- no giant hero section, no decorative gradient blobs, no purple-blue gradient theme.
- use off-white or very light gray background with sharp ink text, subtle warm accent, and one restrained signal color.
- cards may be used only for functional panels, radius <= 8px.
- typography: modern sans for UI, monospace for prompt and URL.
- dense but calm spacing, designed for repeated use.
- include small familiar icons in copy/delete/create buttons.

Important details:
- The URL must be visually prominent and easy to copy manually.
- The page must communicate "plain text", "7 days", and "agent-readable" without long explanatory paragraphs.
- Do not use QR code as the primary sharing artifact.
- Do not put feature marketing text in a hero card.
```

## 16. Technical Stack Recommendation

Given prior n78 reference and likely implementation speed:

- Web: SvelteKit
- Runtime: Bun for development and scripts; Node-compatible production target where required by hosting.
- DB: SQLite for v1 self-host; Postgres-compatible path later
- ORM/query: simple typed SQL or Drizzle
- Deployment China: 阿里云 ECS behind Caddy
- Deployment global later: Vercel/Fly/Render or another VPS
- MCP/CLI: TypeScript package, bundled with Bun to pure JS for Node 18+
- Rust: acceptable for a focused low-level helper only if TypeScript becomes the wrong tool. Do not introduce Rust for basic web/API work.
- Python: not part of this stack.

Stack principle:

- Product/web/control-plane code should be Bun + TypeScript.
- MCP distribution should follow the existing proven pattern: `bun build --target=node` into a JS bundle installable via `npx`.
- Rust is a selective tool, not the default.
- Python should not be introduced for server, scripts, queue workers, or MCP packaging.

Repo shape:

```text
apps/web
packages/mcp
packages/cli
packages/shared
docs
skills/prompt-capsule
```

If speed matters more than monorepo hygiene, start with:

```text
apps/web
packages/mcp
docs
```

## 17. Abuse, Privacy, and Trust

Truthful privacy wording:

> 胶囊内容会存储在服务端。知道链接的人可以访问。不要存放密码、密钥或私密信息。

Discovery wording:

```text
胶囊池
[仅链接] [参与池子]

仅链接:知道链接的人可读,7 天后过期。
参与池子:可能被精选到首页,被陌生人扭到。
```

Default:

- Direct `/new` creation defaults to `link_only`.
- Creation that starts from the open-first homepage loop defaults to `pool_candidate`.
- Remember the user's last choice in local storage.

Required controls:

- Max 7-day anonymous TTL.
- Max 16 KB anonymous content.
- Rate limit by IP hash.
- Content hash dedup optional.
- Report abuse endpoint.
- Admin delete path.
- `robots: noindex` for capsule pages.
- No public index/search in v1.
- No UGC firehose in v1. The discoverable/open-first pool is a curated subset.
- Public pool candidates must pass hard safety gates before any homepage exposure.

Do not claim end-to-end privacy unless client-side encryption exists.

## 18. Launch Content

First 小红书 post angle:

```text
我做了一个「提示词胶囊」。

之前发 Codex 教程, 有人说正文里的 prompt 复制不了, 只能截图再让豆包 OCR。
这件事很蠢: AI 时代最有价值的东西经常是一段可执行指令, 但社媒最不适合承载长指令。

所以我把长提示词装进一个 7 天有效的纯文本链接。
你可以复制, 也可以直接让 Codex / Claude 读取这个 URL 执行。

提示词胶囊: n78.xyz/c/...
```

Post should show:

- the original comment pain
- the tool screen
- generated capsule URL
- Codex consuming the URL
- reader copy success

Do not lead with "开源项目" in the first post. Lead with the concrete pain and artifact.

## 19. Success Criteria

Artifact success:

- The creator can use it in the next 小红书 post.
- URL text is short enough to copy manually from 小红书.
- The text endpoint works with Codex/Claude/Cursor fetch behavior.
- The visual design is good enough to screenshot as part of the post.
- The repo can be open sourced without embarrassment.

Signal success:

- Readers stop needing OCR for the prompt.
- At least one comment says it is easier to copy/use.
- At least one other creator asks how to use it or self-host it.
- The post strengthens the "can turn AI workflow into product" persona.

## 20. Build Order

Gate 0: Foundation

- Repo scaffold.
- DB schema.
- Config for `PUBLIC_BASE_URL`.
- Text endpoint contract tests.

Gate 1: Creator publish flow

- Web create page.
- Create API.
- Result snippets.
- `/c/{slug}` text endpoint.
- Expiry/delete.
- `link_only` / `pool_candidate` discovery mode.
- Deploy to `n78.xyz`.

Gate 2: Open-first curated loop

- Homepage open-first capsule.
- 50 curated seed capsules.
- Pool candidate and curated pool states.
- Local Like/save.
- Share card that reveals the hook, not the full prompt.

Gate 3: Agent-native flow

- CLI create.
- MCP create/get/delete.
- Skill docs.
- README install instructions.

Gate 4: Open source polish

- LICENSE.
- Self-host guide.
- Abuse/privacy docs.
- Global domain decision.
- Optional `promptcapsule.dev` docs site, but keep `n78.xyz/c/{slug}` as the short share URL.

## 21. Open Questions

- Final docs domain: buy `promptcapsule.dev` / `.com` for open source docs, or keep all docs under `n78.xyz` for now?
- Exact content size limit: 16 KB enough for v1, or should anonymous be 32 KB?
- Should `/c/{slug}` be pure text only, with `/view/{slug}` for UI, or should browser Accept negotiation serve HTML to humans?
- Which license for open source: MIT is simplest; AGPL if hosted-service clone protection matters.
- How many seed capsules are enough for the first public launch: minimum 50, or should launch wait until 100+?
- Should pool curation start as a local admin JSON/file workflow, or should v1 include a tiny admin UI?

## 22. Current Recommendation

Build with `n78.xyz` as the canonical capsule URL. Buy a semantic global domain only for docs/brand if available cheaply, but do not wait for it and do not use it for share links.

Lock brand as 提示词胶囊 / Prompt Capsule.

Implement B updated: open-first acquisition loop + utility-first production path.

- `/` lets strangers open a curated capsule first.
- `/new` lets creators generate a link immediately.
- `/c/{slug}` remains pure `text/plain`.
- `/view/{slug}` is human-readable copy UI.
- The discoverable pool is curated, not a raw UGC feed.
- Direct `/new` defaults to `link_only`; homepage-driven creation defaults to `pool_candidate`.

Web, API, MCP, CLI, and skill should be designed together so the project does not become a throwaway short-link tool.

Use Bun + TypeScript as the default implementation stack. Keep Rust optional and narrow. Do not use Python.
