import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from '../config';
import { initSchema } from './capsules';
import { initProgramsSchema } from './programs';

/** Runtime config, resolved once from the process env. */
export const config = loadConfig(process.env);

let db: Database | null = null;

/** Lazily open the SQLite database (WAL) and ensure the schema exists. */
export function getDb(): Database {
	if (!db) {
		mkdirSync(dirname(config.dbPath), { recursive: true });
		const next = new Database(config.dbPath, { create: true });
		// busy_timeout FIRST, before any other statement. The moderation worker is a SECOND
		// writer process against this file; WAL allows one writer at a time and bun:sqlite
		// defaults busy_timeout to 0 (a contended write throws `database is locked` immediately).
		// Setting it first means even the journal_mode/migration statements below wait/retry
		// under contention instead of erroring.
		next.run('PRAGMA busy_timeout = 5000');
		next.run('PRAGMA journal_mode = WAL');
		initSchema(next);
		initProgramsSchema(next, config);
		// Publish only after full init succeeds. If anything above throws, `db` stays null and the
		// next getDb() retries a complete init — never a half-initialized (unmigrated) connection.
		db = next;
	}
	return db;
}
