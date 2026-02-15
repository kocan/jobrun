import * as SQLite from 'expo-sqlite';
import { SCHEMA_VERSION, MIGRATION_001 } from './schema';

const DB_NAME = 'jobrun.db';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync(DB_NAME);
    _db.execSync('PRAGMA journal_mode = WAL;');
    _db.execSync('PRAGMA foreign_keys = ON;');
  }
  return _db;
}

export function initializeDatabase(): void {
  const db = getDatabase();

  // Check current schema version
  try {
    const row = db.getFirstSync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'schema_version'"
    );
    const currentVersion = row ? parseInt(row.value, 10) : 0;
    if (currentVersion >= SCHEMA_VERSION) return;
  } catch {
    // settings table doesn't exist yet — run migrations
  }

  // Run migration 001
  const statements = MIGRATION_001.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  db.withTransactionSync(() => {
    for (const stmt of statements) {
      db.runSync(stmt);
    }
    // Store schema version
    db.runSync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)",
      [String(SCHEMA_VERSION)]
    );
  });
}

export function closeDatabase(): void {
  if (_db) {
    _db.closeSync();
    _db = null;
  }
}

/** For testing — reset the singleton */
export function _resetDb(): void {
  _db = null;
}

export function _setDb(db: SQLite.SQLiteDatabase): void {
  _db = db;
}
