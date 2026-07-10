import { Database } from 'bun:sqlite';
import type { Config } from '../config';
import {
	createCapsule,
	getActiveCapsule,
	getCapsuleRaw,
	isBlocked,
	type Capsule
} from './capsules';

/**
 * Programs: operator-owned stable aliases ("节目码") that point at the current
 * live capsule ("当期卡带"). A program never stores content — it is a pointer that
 * must be actively renewed; if the current tape expires un-renewed, the program
 * reads as off-air. Capsule TTL semantics are untouched: renewal mints a NEW
 * capsule (new slug, fresh TTL) and repoints; the old tape dies on its own clock.
 *
 * Resolution order is slug-first (see resolveTarget): an existing capsule slug
 * always wins, so shipping this table cannot change any existing tape's behavior.
 */
export const PROGRAMS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS programs (
  name         TEXT PRIMARY KEY,
  name_lower   TEXT UNIQUE NOT NULL,
  current_slug TEXT NOT NULL,
  note         TEXT,
  hits         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
`;

export interface Program {
	name: string;
	name_lower: string;
	current_slug: string;
	note: string | null;
	hits: number;
	created_at: string;
	updated_at: string;
}

/** Program row plus the current tape's expiry (LEFT JOIN; null only if dangling). */
export interface ProgramListEntry extends Program {
	current_expires_at: string | null;
}

// 4..32 alphanumerics. Lower bound 4 matches the deployed skill client's
// `/^[0-9A-Za-z]{4,64}$/` validation band (a 3-char name would be rejected by
// clients already in the field). Length must ALSO differ from config.slugLength —
// random slugs are always exactly that long, so a program name of another length
// can never be shadowed by a future randomly-generated slug (slug-first order).
const PROGRAM_NAME_RE = /^[A-Za-z0-9]{4,32}$/;

export function isValidProgramName(name: string, config: Config): boolean {
	return PROGRAM_NAME_RE.test(name) && name.length !== config.slugLength;
}

/**
 * Create the table and enforce the anti-shadowing invariant at startup: if
 * SLUG_LENGTH was changed to the length of an existing program name, random
 * slugs could now collide with (and permanently shadow) that program. Fail loud
 * at boot — a silent shadow would just look like a program that stopped working.
 */
export function initProgramsSchema(db: Database, config: Config): void {
	db.run(PROGRAMS_SCHEMA_SQL);
	const row = db
		.query('SELECT name FROM programs WHERE length(name) = ?')
		.get(config.slugLength) as { name: string } | null;
	if (row) {
		throw new Error(
			`program "${row.name}" has length ${config.slugLength} == SLUG_LENGTH; ` +
				`random slugs could shadow it. Rename the program or revert SLUG_LENGTH.`
		);
	}
}

export function getProgramByLower(db: Database, nameLower: string): Program | null {
	const row = db.query('SELECT * FROM programs WHERE name_lower = ?').get(nameLower) as
		| Program
		| null;
	return row ?? null;
}

export interface ResolvedTarget {
	slug: string;
	/** Display-form program name when resolution went through a program; null for a direct slug hit. */
	program: string | null;
}

/**
 * Resolve a read target (whatever followed /c/ or was passed to read_prompt_tape).
 *
 * 1. Exact capsule-slug match wins — including expired/deleted/blocked rows, so every
 *    existing tape behaves byte-for-byte as before this feature existed.
 * 2. On miss, only a token that LOOKS like a program name (format + length != slugLength)
 *    touches the programs table; garbage input never costs the extra query. The lookup
 *    is case-insensitive via JS toLowerCase() against name_lower (unicode semantics live
 *    in one place — JS — not split between JS and SQL lower()).
 */
export function resolveTarget(db: Database, config: Config, token: string): ResolvedTarget | null {
	if (getCapsuleRaw(db, token)) return { slug: token, program: null };
	if (!PROGRAM_NAME_RE.test(token) || token.length === config.slugLength) return null;
	const program = getProgramByLower(db, token.toLowerCase());
	if (!program) return null;
	return { slug: program.current_slug, program: program.name };
}

/** Count one successful (200) read that went through a program. Survives renewals. */
export function bumpProgramHits(db: Database, nameLower: string): void {
	db.query('UPDATE programs SET hits = hits + 1 WHERE name_lower = ?').run(nameLower);
}

export type ProgramOutcome =
	| { ok: true; program: Program }
	| { ok: false; status: number; error: string };

/**
 * Create a program or repoint an existing one (PUT semantics). The target slug must
 * be a currently-live capsule: not expired, not deleted, not blocked. `pending` is
 * explicitly allowed — under publish-then-review a fresh tape is pending AND publicly
 * readable; if the worker later blocks it, resolution already answers 404 (see
 * renderTape), so a program pointing at it goes dark with no extra machinery.
 *
 * `note` semantics: undefined = keep existing, string = overwrite, null = clear.
 */
export function upsertProgram(
	db: Database,
	config: Config,
	name: string,
	slug: string,
	note: string | null | undefined,
	nowMs: number
): ProgramOutcome {
	if (!isValidProgramName(name, config)) {
		return {
			ok: false,
			status: 422,
			error: `invalid program name (want [A-Za-z0-9]{4,32}, length != ${config.slugLength})`
		};
	}
	if (getCapsuleRaw(db, name)) {
		return { ok: false, status: 422, error: 'name collides with an existing capsule slug' };
	}
	const target = getActiveCapsule(db, slug, nowMs);
	if (!target || isBlocked(target)) {
		return { ok: false, status: 422, error: 'slug must point to a live capsule' };
	}

	const nowIso = new Date(nowMs).toISOString();
	const existing = getProgramByLower(db, name.toLowerCase());
	if (existing) {
		db.query(
			`UPDATE programs SET current_slug = $slug,
			   note = CASE WHEN $noteProvided THEN $note ELSE note END,
			   updated_at = $now
			 WHERE name_lower = $lower`
		).run({
			$slug: slug,
			$noteProvided: note === undefined ? 0 : 1,
			$note: note ?? null,
			$now: nowIso,
			$lower: existing.name_lower
		});
	} else {
		db.query(
			`INSERT INTO programs (name, name_lower, current_slug, note, hits, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 0, ?, ?)`
		).run(name, name.toLowerCase(), slug, note ?? null, nowIso, nowIso);
	}
	const program = getProgramByLower(db, name.toLowerCase());
	if (!program) return { ok: false, status: 500, error: 'upsert failed' };
	return { ok: true, program };
}

export type RenewOutcome =
	| { ok: true; program: Program; capsule: Capsule; deleteToken: string }
	| { ok: false; status: number; error: string };

/**
 * Weekly tape swap: mint a NEW capsule carrying the current tape's content verbatim
 * (fresh slug, fresh default TTL, source 'api', enters moderation as pending like any
 * create) and atomically repoint the program. The old tape is NOT touched — anyone
 * holding its slug keeps the original ≤7-day contract until it dies on its own.
 *
 * Fail-closed guards: a blocked current tape must not be resurrected (409); a
 * manually-deleted one was killed on purpose — repoint via PUT with new content (409).
 * An EXPIRED current tape is fine: rows are never hard-deleted, the content is still
 * in the DB, and the operator owns it anyway.
 */
export function renewProgram(
	db: Database,
	config: Config,
	name: string,
	nowMs: number
): RenewOutcome {
	const program = getProgramByLower(db, name.toLowerCase());
	if (!program) return { ok: false, status: 404, error: 'program not found' };
	const current = getCapsuleRaw(db, program.current_slug);
	if (!current) {
		return { ok: false, status: 500, error: 'program points at a missing capsule (dangling)' };
	}
	if (isBlocked(current)) {
		return { ok: false, status: 409, error: 'current tape is blocked; renewal refused' };
	}
	if (current.deleted_at) {
		return {
			ok: false,
			status: 409,
			error: 'current tape was deleted; repoint via PUT with a fresh capsule instead'
		};
	}

	const swap = db.transaction(() => {
		const created = createCapsule(db, {
			content: current.content,
			title: current.title,
			ttlSeconds: config.defaultTtlSeconds,
			source: 'api',
			hasCallback: current.has_callback === 1,
			nowMs,
			slugLength: config.slugLength
		});
		db.query('UPDATE programs SET current_slug = ?, updated_at = ? WHERE name_lower = ?').run(
			created.capsule.slug,
			new Date(nowMs).toISOString(),
			program.name_lower
		);
		return created;
	});
	const { capsule, deleteToken } = swap();
	const updated = getProgramByLower(db, program.name_lower);
	return { ok: true, program: updated ?? program, capsule, deleteToken };
}

/** Operator dashboard: every program with its current tape's expiry, most recently touched first. */
export function listPrograms(db: Database): ProgramListEntry[] {
	return db
		.query(
			`SELECT p.*, c.expires_at AS current_expires_at
			 FROM programs p LEFT JOIN capsules c ON c.slug = p.current_slug
			 ORDER BY p.updated_at DESC`
		)
		.all() as ProgramListEntry[];
}

/** Remove the pointer only — the current tape is untouched. True iff a row was deleted. */
export function deleteProgram(db: Database, name: string): boolean {
	const res = db.query('DELETE FROM programs WHERE name_lower = ?').run(name.toLowerCase());
	return res.changes > 0;
}
