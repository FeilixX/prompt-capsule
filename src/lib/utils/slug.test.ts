import { test, expect } from 'bun:test';
import { generateSlug, SLUG_ALPHABET } from './slug';

test('generateSlug returns a string of the requested length', () => {
	expect(generateSlug(8)).toHaveLength(8);
	expect(generateSlug(6)).toHaveLength(6);
	expect(generateSlug(12)).toHaveLength(12);
});

test('generateSlug only uses base62 characters', () => {
	const s = generateSlug(64);
	for (const ch of s) {
		expect(SLUG_ALPHABET).toContain(ch);
	}
});

test('generateSlug is non-trivially random across calls', () => {
	const seen = new Set(Array.from({ length: 50 }, () => generateSlug(8)));
	// 50 draws from 62^8 space — collisions here would signal a broken generator.
	expect(seen.size).toBe(50);
});
