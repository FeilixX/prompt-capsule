# 提示词胶囊 v1 · 收敛根定义 (ROOT)

> Date: 2026-07-04 · Status: **canonical v1 root**
> 本文件是**根**。它 supersede 掉 `gstack-office-hours-agent-url-schoolhouse.md` 里的
> "Agent URL Schoolhouse 北极星"。PRD / SPEC / 两份 office-hours 文档降级为**输入**;
> 凡与本文件冲突,以本文件为准。
> 保留不变的是**底层协议契约**(text/plain URL、tpp 五铁律、各家 AI 坑解药、`/c` 纯文本)——
> 那部分已被 5-AI 实测,不重开。

---

## 0. 一句话

提示词胶囊是一个**内容 primitive**:一个人能复制、agent 能 fetch 并执行的短 `text/plain` URL。
它让创作者把一坨长 prompt / agent 指令压成一条能塞进社媒正文的短链;读者复制,或者直接
把 URL 丢给 Codex / Claude / Cursor 让它照做。

不是 prompt 市场,不是 prompt 社区,不是 agent 素养学校。是**磁力链 / 二维码那一档的基础指针**——
只不过被指的东西是"一段任何 agent 都能解引用并执行的指令"。

---

## 1. 自我批评:为什么推翻 Schoolhouse 和 community-first

两轮 office-hours 每跑一次就把概念往上抽一层:
具体工具(HANDOFF)→ 扭蛋消费(一轮)→ agent 素养学校(二轮)。**零代码,纯 framing 漂移。**
第二轮的 "Schoolhouse" 有四个硬伤,我们都认了:

1. **它得一直藏着自己是什么**——文档自己写 "avoid looking like courseware"。定位要求你隐藏定位 = 定位错了。
2. **aha 只响一次,反留存**——学校的天职是毕业。小白学会 "URL = 指令包" 后就没理由回来。
3. **分享物最弱**——没人转发教学法。它要借"无剧透卡"(玩具的机制)才撑得起传播。
4. **风险结构倒了**——用 95 分满配(Web+MCP+skill+50 精选种子+池子+moderation day-one)去包一个
   **一轮对话产出、没被任何人验过**的定位。机制成立 ≠ 这个北极星成立。

同样推翻 **community-first / 先建池子**。理由是操作者自己的结论,也是我认同的:
**社区、池子、策展、发现页,只有在"有人愿意复购"被证明之后才有意义。** 先建墙 = 空墙劝退 +
治理面瞬间变大 + 拖慢核心 loop。90-9-1 是铁律:没有先跑通"有人反复用",UGC 永远长不出来。

---

## 2. 我们的特点(vs FlowGPT / PromptBase / prompt 社区)—— 诚实版

**我们不是**"更多、更好的 prompt"。那是 FlowGPT / PromptBase 的战场,内容量和社区规模上我们必输,别打。

**我们是一个不同的"消费方式 + 分发形状",三条真实差异:**

1. **Agent-native 消费,不是 human copy-paste。**
   FlowGPT 给你一段文字,你粘进 ChatGPT。胶囊给你一个 URL,agent **fetch 并直接执行**。
   当 agent 变成运行时(Codex / Claude Code / Cursor agent),"粘贴 prompt" 这个模型会断——
   你不再粘,你**引用**。URL 是 agent-native 的引用,粘贴文本是 human-native 的。这是个 timing 差异:
   agent-as-runtime 正在发生。

2. **寄生在别人的信息流里,不是一个目的地站点。**
   FlowGPT 是 destination——你得被拉去 flowgpt.com 浏览,这是一堵要往里灌人的墙。
   胶囊的单位是一条**塞在别人小红书 / X / 教程正文里的 URL**,产品本身不需要"来我站里逛"。
   胶囊活在内容已经在的地方。FlowGPT 在自己地盘抢注意力;胶囊寄生现有内容流量。

3. **复购者是内容生产者,不是 prompt 消费者。**
   FlowGPT 的复购者是"不停找更好 prompt 的人"(消费型留存,弱)。
   胶囊的复购者是"不停要打包自己指令的创作者"——他的**发帖节奏本身就是复购引擎**(生产型留存,强)。
   每发一篇 AI / Codex 内容 = 一颗新胶囊。这也是为什么目标用户是**创作者,不是"所有 AI 用户"**。

**诚实说护城河:近期薄。** 不是技术独占——FlowGPT 明天想上 "capsule URL" 也能上。
真实壁垒只有三样,都非技术:**n78.xyz 已备案(国内竞品抄这个 primitive 卡在备案上)+ 先发用户习惯 +
操作者自己的小红书流量**。第一版的完整度和物感本身就是壁垒,别假装有技术护城河。

---

## 3. aha 阶梯(全文脊椎 · 重排序)

传统错误顺序(Schoolhouse 犯的):先教育 aha → 建社区 → 祈祷有人用。
**我们的顺序:**

```
病毒发酵          →  有人用        →  愿意复购            →  社区才有意义
(URL 在信息流里)     (先有人跑通一次)   (第一个真 aha ★)      (step 4,defer 到这之后)
```

- **病毒发酵 = 获客引擎(acquisition)。** 驱动力:塞在别人正文里的短链 + 压缩钩子
  ("1847 字 → 一条链接") + "把这个丢给 Codex 看它干活" 的当场戏法。让**新人**开/建。
- **有人用 = 跑通一次完整 loop。** 粘 → 拿链接 → 发出去 → 有人复制/让 agent 读到。
- **愿意复购 = 第一个真 aha(★ v1 唯一要证明的东西)。** 同一个创作者,发下一篇内容时,
  **又主动做了第二颗胶囊**。这才是产品成立的信号,不是"某个小白惊叹了一次"。
- **社区 / 池子 / 发现 / 策展 = step 4。** 只有复购被证明后才启动。v1 一律不碰。

**第一个复购者画像:** 操作者本人 + 相邻的 AI 教程 / Codex / vibe coding 创作者。
他们复购是因为**发帖这件事本身会重复**。v1 的成败押在"让这类人第二次、第三次自然回来做胶囊",
不押在"教会多少小白 agent 能读 URL"。

---

## 4. v1 到底做什么(精益范围)

### Must ship —— 证明"病毒发酵 → 有人用 → 复购"这条 loop

- `/new`(或 `/`):**utility-first 创建页**。粘长 prompt → 选 TTL → 生成。30 秒内拿到链接。零登录。
- `POST /api/capsules`:匿名创建,返回 slug + 分享物。
- `GET /c/{slug}`:纯 `text/plain` 契约(见 §6),agent 能直接 fetch。
- `GET /view/{slug}`:人类可读页 + 复制 + metadata + 删除入口。
- **分享物 = 病毒引擎**:压缩数字动画("N 字 → 一条链接")+ 一键复制的"给 Codex 读取"文案 +
  小红书文案 + 结果区可导出成图。这块是获客命根,做到能上镜。
- delete token(改删,非登录)、TTL(默认 7 天)、限流、slug 碰撞处理、输入长度校验、fail-closed。
- 部署到 `n78.xyz`(阿里云北京,adapter-node + Caddy + SQLite)。

### Fast-follow —— 服务 Codex / dev 这条复购流,但不阻塞第一个 viral loop

- **CLI create**(`npx ... create prompt.md --ttl 7d`)——创作者在终端顺手做胶囊。
- **MCP create**——在 agent 里直接产胶囊。注意:**消费不需要 MCP**,Codex / Claude Code 原生 fetch URL,
  给它 `/c/{slug}` 就够了;MCP 只是"创建"的便利。所以它是 fast-follow,不是 must-ship。
- **skill docs**——教 agent 何时该建胶囊、何时只读、如何提醒用户"非私密"。

### DEFER —— 全部押后到"复购已证明"之后(step 4+)

公开胶囊墙 · 池子 / 候选池 / 精选 / moderation 重系统 · 50 颗策展种子作为**上线前置条件** ·
Schoolhouse 教学首页 · 扭蛋 gacha 视觉主题 · 投票 / 点踩 / 评论 / 排行 / remix / 盖楼 / 漂流瓶 ·
账号系统 / 跨设备收藏 · callback 双向循环(留 `has_callback` flag 位,v1 只做静态胶囊) ·
prompt 优化 · 加密 / 隐私存储。

> 注:种子内容没死,只是**降级**——不再是"北极星",而是操作者自己发小红书时顺手压的真胶囊。
> "schoolhouse 口味"顶多是这批自用胶囊的编辑声音,不是一个要 day-one 交付的策展工程。

---

## 5. 继承的既有**知识**(不是要移植的代码)

这些是已验证 / 已锁的**协议知识**,直接继承。但**代码全新重构**——参考源是知识来源,不是复用包袱
(理由见 `PLAN-v1.md` §1:从耦合的 roast 代码抽取比干净重写更费事;build effort 定价为零):

- **底层 primitive 已 5-AI 实测**(ChatGPT / DeepSeek / Kimi / Claude / Doubao 全绿)。见 `~/n78/reference/punkgo-tpp-README.md`。**机制不用再验。**
- **tpp 五铁律**:预建所有 URL · 每个响应自包含 · 按最弱 AI 优雅降级 · 每个 URL 破缓存 · 一切用 markdown 链接。
- **各家 AI 坑解药**(自己实现,内建服务端):豆包空格 trim + `?t=` 破缓存 · DeepSeek 多层 decode · GPT 不渲染 text/plain 外链图 · Claude "这是注入但我选择参与" 安全头。
- **参考源 = `~/n78/reference/punkgo-roast-web/`**(SvelteKit 5,roast 站):**只当协议行为的活样本读**,不 port 它的 Supabase 层 / roast 耦合。v1 从零干净写,不 extract。
- **text/plain 契约、TTL、delete token、`PUBLIC_BASE_URL` 不硬编码**——见 PRD §8/§9/§14。

---

## 6. 技术契约(收敛冲突点 + config-over-code)

三份文档打架的地方,在这里一次性拍死。所有可变量走 **config / env,不硬编码**(config-over-code 铁律):

| 冲突点 | 收敛决定 | 理由 |
| --- | --- | --- |
| 路由前缀 `/x` vs `/c` | **`/c/{slug}`** | README Current Decisions 已锁 `/c` 纯文本;`c = capsule` 语义清晰。前缀走 `CAPSULE_ROUTE_PREFIX` 配置。 |
| 内容上限 2000 vs 16KB | **16 KB** | 真实 Codex workflow prompt 轻松超 2000 字;2000 是从 roast topic 继承的历史值。走 `MAX_CONTENT_BYTES`。 |
| QR 二维码 | **v1 不做** | 可分享单位是文本短链本身;QR 多一个"扫"的动作跟"复制"抢,且 `n78.xyz/c/xxxx` 已够短可手抄。hero = URL + 压缩数字。 |
| callback 双向循环 | **v1 只做静态胶囊,留 `has_callback` flag 位** | tpp 双向循环是深度层,不阻塞第一个 loop。 |
| slug 长度 | **8 位 base62 起,可缩** | 碰撞概率 vs 社媒可手抄短度平衡。走 `SLUG_LENGTH`。 |

其余契约(`GET /c` headers、`POST /api/capsules` 请求/响应、`capsules` 表)以 **PRD §8/§9/§10 为准**——
但 v1 的 `capsules` 表**砍掉 pool / moderation / 一堆 pool_* 计数列**(那些是 step 4 的),只留:
`id / slug / title / content / content_sha256 / content_bytes / created_at / expires_at / deleted_at /
delete_token_hash / source / view_count / copy_count / has_callback`。
`discovery_mode` / `pool_*` 等列等 step 4 真要建池子时再加,不做 premature schema。

配置清单(env):

```text
PUBLIC_BASE_URL=https://n78.xyz
ALLOWED_HOSTS=n78.xyz
CAPSULE_ROUTE_PREFIX=/c
MAX_CONTENT_BYTES=16384
DEFAULT_TTL_SECONDS=604800   # 7d
MAX_TTL_SECONDS=604800
SLUG_LENGTH=8
```

---

## 7. v1 成功的唯一指标

**不是** aha 计数,**不是**首页多惊艳,**不是**种子多精。是:

> **同一个创作者,发下一篇内容时,主动做了第二颗胶囊。**(复购发生 = 根成立)

次级信号:有陌生读者成功复制 / 让 agent 读到过一颗;至少一个其他创作者问怎么用或怎么自建。
这些都服务于"复购是否会发生",不替代它。

---

## 8. 动手前要拍板的开放问题(少数几个,别再 framing)

1. **首屏 = `/`(带一点获客钩子)还是直接 `/new`(纯编辑器)?** 我倾向 `/new` 作为默认落地,`/` 后置——
   因为 v1 押复购(创作者),不押陌生人首戳。但这会削弱"病毒发酵首屏"。要不要为 viral 保留一个轻量 `/`?
2. **压缩数字 hero 的物感方向**——TinyPNG 式克制,还是保留一点 pop/压铸手感?(操作者定调,别默认套 roast 8-bit 狗风。)
3. **CLI / MCP / skill 到底算 must 还是 fast-follow?** 本文按 fast-follow 定;若第一波流量就是 Codex/dev,可能要提前 MCP-create。
4. **repo 形态**:先 `apps/web` 单站跑通,还是 day-one 就 monorepo(`apps/web` + `packages/*`)?我倾向前者,快。
