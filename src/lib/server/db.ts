import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from '../config';
import { initSchema } from './capsules';

/** Runtime config, resolved once from the process env. */
export const config = loadConfig(process.env);

let db: Database | null = null;

/** Lazily open the SQLite database (WAL) and ensure the schema exists. */
export function getDb(): Database {
	if (!db) {
		mkdirSync(dirname(config.dbPath), { recursive: true });
		db = new Database(config.dbPath, { create: true });
		db.run('PRAGMA journal_mode = WAL');
		initSchema(db);
	}
	return db;
}
