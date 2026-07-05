import { browser } from '$app/environment';

export type Locale = 'zh' | 'en';

/** Reactive UI language. Server always renders zh (never mutated server-side, so
 *  no cross-request leak); the client picks it up from localStorage / navigator. */
export const i18n = $state<{ locale: Locale }>({ locale: 'zh' });

function applyLang(l: Locale) {
	if (browser) document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
}

export function setLocale(l: Locale) {
	i18n.locale = l;
	if (browser) {
		try {
			localStorage.setItem('pt_locale', l);
		} catch {
			/* private mode — ignore */
		}
		applyLang(l);
	}
}

export function initLocale() {
	if (!browser) return;
	try {
		const saved = localStorage.getItem('pt_locale');
		if (saved === 'en' || saved === 'zh') {
			i18n.locale = saved;
			applyLang(saved);
			return;
		}
	} catch {
		/* ignore */
	}
	const nav = (navigator.language || '').toLowerCase();
	i18n.locale = nav.startsWith('zh') ? 'zh' : 'en';
	applyLang(i18n.locale);
}

type Dict = Record<string, string>;

// Copy is deliberately human: short, plain, a little punk. No "赋能 / 多重防护 /
// 即取即用 / robust / seamless". A founder wrote this, not a model.
const ZH: Dict = {
	// nav / chrome
	nav_rules: '内容须知',
	nav_lang: 'EN',
	nav_source: '源码在 GitHub',
	policy_title: '内容须知',
	policy_body:
		'别录违法、侵权、色情、暴力、赌博、诈骗、仇恨或用来害人的东西。发现一律删，情节严重的报给相关部门。你录的、你分享的，责任你自己担。',
	policy_ok: '知道了',
	foot_copyright: '© 2026 提示词卡带 · text/plain · n78.xyz',
	disclaimer:
		'卡带都是用户自己录的，跟本站立场无关。这是临时存储，随时可能失效或被删，不保证一直在。别放密码、密钥、隐私或违法内容 —— 出了事你自己担。',

	// home hero
	wm_l1: '提示词卡带',
	tagline_a: '一长段提示词，',
	tagline_hl: '封成一条链接',
	tagline_b: '。',
	input_head: '>_ 提示词输入',
	input_mode: 'TXT MODE ■',
	title_ph: '起个名（选填）· 比如：周报生成器、代码审查助手…',
	body_ph: '把你的长提示词 / AI 指令粘在这儿…',
	seg_1h: '1 小时',
	seg_1d: '1 天',
	seg_7d: '7 天',
	record: '录制卡带',
	recording: '录制中…',
	unit_char: '字',
	over_limit: '太长了，精简一下',
	chip_expires: 'EXPIRES',
	// privacy line: 纯文本 · {ttl}有效 · ...
	privacy_a: '纯文本 · ',
	privacy_valid: '有效 · ',
	privacy_b: '内容存在我们服务器上，别放密码、密钥这些私密东西。',

	// steps
	step1_h: '贴上提示词',
	step1_p: '多长都行，什么格式都认。',
	step2_h: '封成一盘卡带',
	step2_p: '一键换一条 n78.xyz 短链接。',
	step3_h: '发给 AI',
	step3_p: '甩给 Codex、Claude、豆包 —— 打开就照着做。',

	// features
	feat1_h: '我们不看',
	feat1_p: '加密存着，不读内容，也不拿去训练。',
	feat2_h: '开源可查',
	feat2_p: '代码全在 GitHub —— 不信我们？自己读，自己跑一份。',
	feat3_h: '到点就没',
	feat3_p: '1 小时、1 天还是 7 天你定，到点自己清空。',
	feat4_h: 'AI 拿了就用',
	feat4_p: 'AI 打开直接读，不用你在旁边解释。',

	// modal
	m_head_rec: '录制中…',
	m_head_done: '封好了 ✦',
	m_head_err: '没录成',
	m_head_del: '删掉了',
	m_play_rec: '● REC · 写入中…',
	m_play_done: '■ 已封好 · 可以分享了',
	m_url_rec: 'n78.xyz/c/········',
	m_copy_agent: '复制给 AI 用',
	m_copy_agent_done: '✔ 复制了，去粘给 AI',
	m_copy_link: '复制分享链接',
	m_copy_link_done: '✔ 链接复制了',
	m_meta_expires: '有效期到',
	m_meta_open: '打开查看页 →',
	m_tok_label: '删除口令（想删这盘时用，只显示这一次）：',
	m_again: '再录一盘 →',
	m_delete: '删掉这盘',
	m_del_q: '真删？删了就没了。',
	m_del_yes: '删',
	m_del_yes_busy: '删除中…',
	m_del_cancel: '算了',
	m_deleted_line: '这盘卡带删了，内容也清空了。',
	m_err_retry: '再试一次',
	m_err_generic: '没录上，网络抽风了。再试试。',

	// view
	v_now_playing: '正在播放：',
	v_untitled: '未命名卡带',
	v_panel: '提示词内容',
	v_copy_agent: '复制给 AI 用',
	v_copy_agent_done: '✔ 复制了，去粘给 AI',
	v_copy_raw: '复制原文',
	v_copy_raw_done: '✔ 原文复制了',
	v_del_label: '删除口令',
	v_del_ph: '粘贴你当初存下的口令',
	v_del_wrong: '删除口令不对',
	v_del_fail: '删除失败',
	v_net_err: '网络错误',
	v_cta: '自己封一盘',

	// void / 404
	void_line: '这盘卡带过期或被删了，内容已经清空 —— 短命封装，本来就该这样。',
	void_cta: '封一盘新的',
	e404_line: '这儿没有这盘卡带 —— 可能过期了、被删了，或者压根没录过。',
	e404_cta: '回首页',

	// skill page (/skill)
	nav_skill: 'SKILL',
	sk_title: '接入 & 使用 · 提示词卡带',
	sk_meta: '提示词卡带 Skill + 远程 MCP 的安装与使用：把提示词封成一次性 URL，任何 agent 能直接 fetch。',
	sk_eyebrow: 'USING · 接入指南',
	sk_h1a: '把提示词',
	sk_h1hl: '封成卡带',
	sk_h1b: '，给任何 agent 用',
	sk_lede_a: '提示词卡带 = 把一段提示词 / system prompt / 长指令封成一次性 URL。链接 ',
	sk_lede_b: ' 以纯文本返回，任何 agent 直接 fetch 就能照着执行；人也能看。有效期最长 7 天，带删除口令。',
	sk_chip_live: 'n78.xyz/mcp · 已上线',
	sk_chip_oss: '开源 · MIT',
	sk_k1: '一分钟理解',
	sk_h2_1: '你有一段好东西，封进卡带，给出去。',
	sk_flow1_b: '一段提示词',
	sk_flow1_s: '你调好的 prompt / 长指令',
	sk_flow2_b: '封成卡带',
	sk_flow3_b: '一个链接',
	sk_note1:
		'链接两副面孔：/c/{slug} 纯文本给 agent fetch，/view/{slug} 给人看。到期或用删除口令销毁后即失效。',
	sk_k2: '三种接入方式',
	sk_h2_2: '按你手上有什么，选一种。',
	sk_c1_title: '远程 MCP',
	sk_c1_chip: '推荐 · 零安装',
	sk_c1_body:
		'把这个端点加进任何 MCP 客户端（Claude、Cursor 等），填一个 URL 就行。之后直接对 agent 说「把这段封成卡带」，它会调工具、返回链接。',
	sk_c1_comment: '// Claude / Cursor 的 mcp 配置',
	sk_c2_title: 'HTTP API',
	sk_c2_chip: '已上线',
	sk_c2_body:
		'不想接 MCP，直接打接口。一条 POST 建好，返回里 url 给 agent、view_url 给人、agent_text 是现成话术。',
	sk_c2_content: '帮我审查当前 repo 并输出诊断',
	sk_c3_title: 'Skill 包',
	sk_c3_body:
		'一个 SKILL.md 教 agent 三层降级：能调 MCP 就调；不能就用自带 client.js 打 HTTP；再不行就引导用户来 n78.xyz 手动封 + 出一段分享文案。装进支持 skill 的 agent 平台即可，源码在 ',
	sk_c3_link: '仓库 skills/prompt-tape/',
	sk_k3: '三个工具',
	sk_h2_3: 'MCP 提供的三个动作。',
	sk_th_tool: '工具',
	sk_th_args: '参数',
	sk_th_ret: '返回',
	sk_read_args: 'target（slug 或 URL）',
	sk_read_ret: '卡带正文',
	sk_k4: '一个完整例子',
	sk_h2_4: '建 → 分享 / 让下游 fetch → 删。',
	sk_ex_c1: '// 1. agent 调 create，返回：',
	sk_ex_human: '// 给人看',
	sk_ex_agent: '// 给 agent fetch',
	sk_ex_private: '// 私藏，别公开',
	sk_ex_c2: '// 2. 下游 agent 直接 fetch raw_url，拿纯文本正文照做',
	sk_ex_c3: '// 3. 不想留了，用口令删',
	sk_k5: '约束',
	sk_h2_5: '几条别踩的线。',
	sk_lim1_b: '正文 ≤ 16KB。',
	sk_lim1: '超了会 413。卡带装提示词，不装文件。',
	sk_lim2_b: '有效期 ≤ 7 天',
	sk_lim2: '（默认 7 天，可传 ttl_seconds 调短），到期自动失效。',
	sk_lim3_b: '删除口令私藏。',
	sk_lim3: '别贴进公开分享文案 —— 谁拿到谁能删。',
	sk_lim4_b: '创建限流 10 次/分',
	sk_lim4: '（每 IP）。正常用够。',
	sk_lim5_b: '公开匿名',
	sk_lim5: '：没有账户、没有登录。卡带临时、公开、可 fetch。',
	sk_cta: '去建一个卡带'
};

const EN: Dict = {
	nav_rules: 'House rules',
	nav_lang: '中',
	nav_source: 'Source on GitHub',
	policy_title: 'House rules',
	policy_body:
		"Don't seal anything illegal, stolen, sexual, violent, hateful, or built to scam or hurt people. We delete violations on sight and report the serious ones. What you record and share is on you.",
	policy_ok: 'Got it',
	foot_copyright: '© 2026 Prompt Tape · text/plain · n78.xyz',
	disclaimer:
		"Tapes are recorded by users, not us. Storage is temporary and can disappear or be deleted anytime — no uptime promised. Keep passwords, keys, and private stuff out. Whatever goes wrong is on you.",

	wm_l1: '',
	tagline_a: 'One long prompt, ',
	tagline_hl: 'sealed into a link',
	tagline_b: '.',
	input_head: '>_ PROMPT INPUT',
	input_mode: 'TXT MODE ■',
	title_ph: 'Name it (optional) · e.g. Weekly report, Code reviewer…',
	body_ph: 'Paste your long prompt or AI instructions here…',
	seg_1h: '1 hour',
	seg_1d: '1 day',
	seg_7d: '7 days',
	record: 'Record tape',
	recording: 'Recording…',
	unit_char: 'chars',
	over_limit: 'Too long — trim it down',
	chip_expires: 'EXPIRES',
	privacy_a: 'Plain text · gone in ',
	privacy_valid: ' · ',
	privacy_b: "it lives on our server, so keep passwords and secrets out.",

	step1_h: 'Paste your prompt',
	step1_p: 'Any length, any format.',
	step2_h: 'Seal it into a tape',
	step2_p: 'One click, one n78.xyz short link.',
	step3_h: 'Hand it to your AI',
	step3_p: 'Drop it to Codex, Claude, whatever — it opens and runs.',

	feat1_h: "We don't read it",
	feat1_p: "Encrypted at rest. We don't read it or train on it.",
	feat2_h: 'Open source',
	feat2_p: "It's all on GitHub. Don't trust us? Read the code, or self-host.",
	feat3_h: 'Gone on time',
	feat3_p: '1 hour, 1 day, or 7 days — you pick, it clears itself.',
	feat4_h: 'Made for agents',
	feat4_p: 'Your AI opens it and reads. No hand-holding.',

	m_head_rec: 'Recording…',
	m_head_done: 'Sealed ✦',
	m_head_err: "Didn't work",
	m_head_del: 'Deleted',
	m_play_rec: '● REC · writing…',
	m_play_done: '■ Sealed · ready to share',
	m_url_rec: 'n78.xyz/c/········',
	m_copy_agent: 'Copy for AI',
	m_copy_agent_done: '✔ Copied — paste it to your AI',
	m_copy_link: 'Copy share link',
	m_copy_link_done: '✔ Link copied',
	m_meta_expires: 'Good until',
	m_meta_open: 'Open the tape →',
	m_tok_label: 'Delete key (to kill this tape later — shown once):',
	m_again: 'Record another →',
	m_delete: 'Delete this tape',
	m_del_q: 'Sure? No undo.',
	m_del_yes: 'Delete',
	m_del_yes_busy: 'Deleting…',
	m_del_cancel: 'Cancel',
	m_deleted_line: "Tape deleted. The content's gone.",
	m_err_retry: 'Try again',
	m_err_generic: "Couldn't record it — network hiccup. Try again.",

	v_now_playing: 'Now playing: ',
	v_untitled: 'Untitled tape',
	v_panel: 'The prompt',
	v_copy_agent: 'Copy for AI',
	v_copy_agent_done: '✔ Copied — paste it to your AI',
	v_copy_raw: 'Copy raw text',
	v_copy_raw_done: '✔ Text copied',
	v_del_label: 'Delete key',
	v_del_ph: 'Paste the key you saved',
	v_del_wrong: 'Wrong delete key',
	v_del_fail: "Couldn't delete it",
	v_net_err: 'Network error',
	v_cta: 'Seal your own',

	void_line: "This tape expired or got deleted, and the content's gone — a short life is the whole point.",
	void_cta: 'Seal a new one',
	e404_line: 'No tape here — expired, deleted, or never recorded in the first place.',
	e404_cta: 'Back home',

	// skill page (/skill)
	nav_skill: 'SKILL',
	sk_title: 'Setup & usage · Prompt Tape',
	sk_meta: 'Install and use Prompt Tape as a Skill + remote MCP: seal a prompt into a one-time URL any agent can fetch.',
	sk_eyebrow: 'USING · GET STARTED',
	sk_h1a: 'Seal a prompt into ',
	sk_h1hl: 'a tape',
	sk_h1b: ' — for any agent',
	sk_lede_a: 'Prompt Tape = seal a prompt / system prompt / long instruction into a one-time URL. ',
	sk_lede_b: ' returns plain text any agent can fetch and run; humans can read it too. Lasts up to 7 days, comes with a delete key.',
	sk_chip_live: 'n78.xyz/mcp · live',
	sk_chip_oss: 'Open source · MIT',
	sk_k1: 'The gist',
	sk_h2_1: 'Got something good? Seal it, hand it over.',
	sk_flow1_b: 'A prompt',
	sk_flow1_s: 'your tuned prompt / long instruction',
	sk_flow2_b: 'Seal it',
	sk_flow3_b: 'A link',
	sk_note1:
		'Two faces: /c/{slug} is plain text for agents to fetch, /view/{slug} is for humans. Gone once it expires or you delete it.',
	sk_k2: 'Three ways in',
	sk_h2_2: "Pick the one that fits what you've got.",
	sk_c1_title: 'Remote MCP',
	sk_c1_chip: 'Recommended · zero install',
	sk_c1_body:
		"Add this endpoint to any MCP client (Claude, Cursor, …) — one URL, done. Then tell your agent “seal this into a tape” and it calls the tool and hands back a link.",
	sk_c1_comment: '// mcp config for Claude / Cursor',
	sk_c2_title: 'HTTP API',
	sk_c2_chip: 'live',
	sk_c2_body:
		"Skip MCP, hit the API. One POST and you're done — url is for the agent, view_url for humans, agent_text is a ready-made line.",
	sk_c2_content: 'review my current repo and report issues',
	sk_c3_title: 'Skill package',
	sk_c3_body:
		'A SKILL.md teaches the agent to fall back in three layers: call MCP if it can; else the bundled client.js over HTTP; else guide the user to n78.xyz and draft a share post. Install it on any skill-capable platform. Source in ',
	sk_c3_link: 'the repo — skills/prompt-tape/',
	sk_k3: 'Three tools',
	sk_h2_3: 'What the MCP endpoint does.',
	sk_th_tool: 'Tool',
	sk_th_args: 'Args',
	sk_th_ret: 'Returns',
	sk_read_args: 'target (slug or URL)',
	sk_read_ret: "the tape's text",
	sk_k4: 'A full example',
	sk_h2_4: 'Create → share / let agents fetch → delete.',
	sk_ex_c1: '// 1. agent calls create, gets back:',
	sk_ex_human: '// for humans',
	sk_ex_agent: '// for agents to fetch',
	sk_ex_private: '// keep private',
	sk_ex_c2: '// 2. downstream agent fetches raw_url, runs the plain text',
	sk_ex_c3: '// 3. done with it? delete with the key',
	sk_k5: 'Limits',
	sk_h2_5: 'A few lines not to cross.',
	sk_lim1_b: 'Content ≤ 16KB.',
	sk_lim1: ' Over that → 413. Tapes hold prompts, not files.',
	sk_lim2_b: 'Lifespan ≤ 7 days',
	sk_lim2: ' (7 by default; pass ttl_seconds to shorten). Auto-expires.',
	sk_lim3_b: 'Keep the delete key private.',
	sk_lim3: " Don't put it in a public post — anyone with it can delete.",
	sk_lim4_b: 'Create limit: 10/min',
	sk_lim4: ' per IP. Plenty for normal use.',
	sk_lim5_b: 'Public and anonymous',
	sk_lim5: ': no accounts, no login. Tapes are temporary, public, fetchable.',
	sk_cta: 'Go make a tape'
};

const DICTS: Record<Locale, Dict> = { zh: ZH, en: EN };

/** Look up a copy string for the current locale (falls back to zh, then the key). */
export function t(key: keyof typeof ZH): string {
	return DICTS[i18n.locale][key] ?? ZH[key] ?? (key as string);
}
