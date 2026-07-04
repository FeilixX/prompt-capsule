import { randomBytes } from 'node:crypto';

export const SLUG_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Random base62 slug of `len` chars. Slight modulo bias is acceptable for capsule slugs. */
export function generateSlug(len: number): string {
	const bytes = randomBytes(len);
	let out = '';
	for (let i = 0; i < len; i++) {
		out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
	}
	return out;
}
