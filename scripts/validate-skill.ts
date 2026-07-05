/// <reference types="bun" />
// 校验 skills/prompt-tape/ 包:SKILL.md frontmatter(name/description)、单文件 ≤10MB、总 ≤30MB。
export {};
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'skills/prompt-tape';
let fail = 0;
const bad = (m: string) => {
	console.error(`FAIL: ${m}`);
	fail++;
};

// SKILL.md frontmatter
const text = await Bun.file(join(dir, 'SKILL.md')).text();
const m = text.match(/^---\n([\s\S]*?)\n---/);
if (!m) bad('SKILL.md 无 frontmatter');
else {
	for (const key of ['name', 'description']) {
		if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(m[1])) bad(`SKILL.md frontmatter 缺 ${key}`);
	}
	const nameMatch = m[1].match(/^name:\s*(\S+)/m);
	if (nameMatch && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nameMatch[1])) {
		bad(`SKILL.md name 非 kebab-case ASCII: ${nameMatch[1]}`);
	}
}

// 文件大小
let total = 0;
for (const f of readdirSync(dir)) {
	const size = statSync(join(dir, f)).size;
	total += size;
	if (size > 10 * 1024 * 1024) bad(`${f} > 10MB`);
}
if (total > 30 * 1024 * 1024) bad(`包总大小 > 30MB (${total})`);

if (fail === 0) console.log(`PASS: skills/prompt-tape 校验通过 (总 ${(total / 1024).toFixed(1)}KB)`);
process.exit(fail === 0 ? 0 : 1);
