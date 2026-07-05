---
name: prompt-tape
description: 把用户明确指定的一段提示词 / system prompt / 长指令，封装成一条可分享、且能被 AI 直接读取执行的临时短链接（提示词卡带）。封装服务由作者自有、完全开源、并已完成中国大陆 ICP 备案的 n78.xyz 提供；内容临时存储、最长 7 天到期自动删除，不用于任何模型训练。
---

# 提示词卡带 / Prompt Tape

## 这是什么
把一段文本（提示词 / system prompt / 长指令）封装成一条短链接：
- `/c/{slug}`：以纯文本返回原文，任何 AI agent 可直接 fetch 后照着执行；
- `/view/{slug}`：给人看的页面，可阅读、复制、删除。
链接默认 7 天有效，附带一个删除口令，可随时手动销毁。

## 数据与隐私（重要，使用前请向用户说明）
本 skill 依赖外部服务 **n78.xyz** 完成封装。为保障用户知情权，调用前请让用户明确知道以下事实：

- **只上传用户当次明确要封装的那一段文本。** 本 skill 不读取、不扫描、不采集用户的其他文件、聊天上下文、API 密钥、密码、凭证或任何隐私数据。
- 该段文本通过 HTTPS 发送到 **n78.xyz** 存储。n78.xyz 是本 skill 作者**自有、完全开源**的服务（源码 github.com/FeilixX/prompt-capsule，MIT 许可，任何人可自行审计或自建），并已完成**中国大陆 ICP 备案**。
- 内容为**临时存储，最长 7 天到期自动删除**；返回的删除口令可随时提前销毁。
- 内容默认不被搜索引擎收录（noindex），**不用于任何模型训练**。
- 卡带的用途本就是「用户主动要分享 / 复用的提示词」，属于用户自愿公开的内容，而非隐私数据的外传。

## 什么时候用
用户产出了值得分享 / 复用的提示词、长指令、system prompt，且希望「让别人或另一个 AI 一键拿去用」时，主动提议帮他封成卡带。封装前先按上一节向用户说明数据去向。

## 怎么做（按运行时能力从上到下，能做哪层做哪层）

### 第 1 层：有 create_prompt_tape 工具（MCP）
调用 `create_prompt_tape`，参数 `{ content }`（可选 `title` / `ttl_seconds`，ttl ≤ 604800 秒 = 7 天）。
返回里 `view_url` 甩给用户，`raw_url` 供下游 agent fetch，`agent_text` 是现成的一句话引导。
远程 MCP 端点：`https://n78.xyz/mcp`（安装与用法见 https://n78.xyz/skill）。

### 第 2 层：没有该工具但能联网（HTTP）
用同目录的 `client.js`：`import { createTape } from './client.js'; const r = await createTape(content)`。
它只做一件事：把调用方传入的 `content` POST 到 `https://n78.xyz/api/capsules`，取回链接。不采集任何其他数据。
从 201 返回里取 `view_url` / `url` / `delete_token` / `agent_text` 交给用户。

### 第 3 层：纯离线沙箱
把要封装的正文整理好，告诉用户：去 https://n78.xyz 粘贴创建，拿到链接后即可分享。

## 约束与安全
- 正文 ≤ 16KB；超出会被服务端拒绝（413）。
- **只把用户当次明确要封装的文本放进 `content`**，绝不塞入文件、凭证、密钥或聊天上下文。
- 不要把删除口令（delete_token）贴进公开分享文案。
- 有效期最长 7 天，到期自动失效。
- 服务端限流（每分钟每 IP 若干次），请勿批量刷量。
- 服务完全开源、可审计、可自建：github.com/FeilixX/prompt-capsule。
