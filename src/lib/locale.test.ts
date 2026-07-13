import { test, expect, describe } from 'bun:test';
import { parseAcceptLanguage, resolveLocale, isLocale, htmlLang } from './locale';

describe('parseAcceptLanguage', () => {
	test('plain zh / en tags', () => {
		expect(parseAcceptLanguage('zh-CN')).toBe('zh');
		expect(parseAcceptLanguage('zh-Hant')).toBe('zh');
		expect(parseAcceptLanguage('en-US')).toBe('en');
	});

	test('q-weight ordering wins over list order', () => {
		// en outranks zh despite zh appearing first
		expect(parseAcceptLanguage('zh;q=0,en;q=1')).toBe('en');
		// zh outranks a leading unsupported fr
		expect(parseAcceptLanguage('fr,zh;q=0.9')).toBe('zh');
		expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
	});

	test('q=0 is ignored', () => {
		expect(parseAcceptLanguage('zh;q=0')).toBeNull();
		expect(parseAcceptLanguage('zh;q=0, fr')).toBeNull();
	});

	test('wildcard and empty defer to fallback (null)', () => {
		expect(parseAcceptLanguage('*')).toBeNull();
		expect(parseAcceptLanguage('')).toBeNull();
		expect(parseAcceptLanguage(null)).toBeNull();
		expect(parseAcceptLanguage('fr,de')).toBeNull();
	});
});

describe('resolveLocale priority', () => {
	test('explicit cookie wins over everything', () => {
		expect(resolveLocale({ cookie: 'zh', accept: 'en-US', fallback: 'en' })).toBe('zh');
		expect(resolveLocale({ cookie: 'en', accept: 'zh-CN', fallback: 'zh' })).toBe('en');
	});

	test('invalid cookie is ignored, Accept-Language used next', () => {
		expect(resolveLocale({ cookie: 'xx', accept: 'zh-CN', fallback: 'en' })).toBe('zh');
		expect(resolveLocale({ cookie: '', accept: 'en', fallback: 'zh' })).toBe('en');
	});

	test('falls back when no cookie and no supported Accept-Language', () => {
		expect(resolveLocale({ cookie: null, accept: 'fr,de', fallback: 'en' })).toBe('en');
		expect(resolveLocale({ cookie: null, accept: null, fallback: 'zh' })).toBe('zh');
	});
});

describe('helpers', () => {
	test('isLocale', () => {
		expect(isLocale('zh')).toBe(true);
		expect(isLocale('en')).toBe(true);
		expect(isLocale('fr')).toBe(false);
		expect(isLocale(undefined)).toBe(false);
	});
	test('htmlLang', () => {
		expect(htmlLang('zh')).toBe('zh-CN');
		expect(htmlLang('en')).toBe('en');
	});
});
