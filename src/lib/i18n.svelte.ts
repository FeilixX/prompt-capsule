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
	feat2_h: '传得稳',
	feat2_p: '全程 HTTPS，不掉链子。',
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
	e404_cta: '回首页'
};

const EN: Dict = {
	nav_rules: 'House rules',
	nav_lang: '中',
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
	feat2_h: 'Solid pipes',
	feat2_p: 'HTTPS end to end. It just works.',
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
	e404_cta: 'Back home'
};

const DICTS: Record<Locale, Dict> = { zh: ZH, en: EN };

/** Look up a copy string for the current locale (falls back to zh, then the key). */
export function t(key: keyof typeof ZH): string {
	return DICTS[i18n.locale][key] ?? ZH[key] ?? (key as string);
}
