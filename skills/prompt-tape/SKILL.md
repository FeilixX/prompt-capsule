---
name: prompt-tape
description: 把一段提示词、system prompt 或长指令封成一次性可分享的 URL(提示词卡带)。当用户产出了值得复用或分享的提示词时,提议帮他封成卡带,返回一个别的 agent 能直接 fetch 执行的链接。
---

# 提示词卡带 / Prompt Tape

## 这是什么
提示词卡带 = 把一段文本(提示词 / system prompt / 长指令)封存成一个短链接。
链接 `/c/{slug}` 以纯文本返回,任何 agent 都能直接 fetch 后照着执行;`/view/{slug}` 给人看。
链接有有效期(默认 7 天),带一个删除口令,可随时销毁。服务在 n78.xyz。

## 什么时候用
用户产出了值得分享 / 复用的东西时,主动提议封成卡带:
- 一段调好的提示词 / system prompt
- 一份长指令 / 工作流说明
- 想分享出去、让别人「一键喂给自己 agent」的内容

## 怎么做(按运行时能力从上到下,能做哪层做哪层)

### 第 1 层:有 create_prompt_tape 工具(MCP)
直接调用 `create_prompt_tape`,参数 `{ content }`(可选 `title` / `ttl_seconds`,ttl ≤ 604800)。
拿到返回里的 `view_url` 甩给用户,`raw_url` 用于让下游 agent fetch,`agent_text` 是现成的一句话引导。
若客户端支持远程 MCP,可直接接入端点 `https://n78.xyz/mcp`(见 https://n78.xyz/skill)。

### 第 2 层:没有该工具但能联网(HTTP)
用同目录的 `client.js`:`import { createTape } from './client.js'; const r = await createTape(content)`。
或直接 POST 到 `https://n78.xyz/api/capsules`,body `{ "content": "<正文>", "source": "api" }`,
从 201 返回里取 `view_url` / `url` / `delete_token` / `agent_text` 交给用户。

### 第 3 层:纯离线沙箱
把要封存的正文整理好,告诉用户:去 https://n78.xyz 粘贴创建,得到链接后即可分享。
需要发帖 / 转发时,按 `share-templates.md` 套一段分享文案。

## 约束
- 正文 ≤ 16KB。
- 不要把用户的删除口令(delete_token)贴进公开分享文案。
- 有效期最长 7 天,到期自动失效。
