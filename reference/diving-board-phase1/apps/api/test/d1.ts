// A minimal D1Database stand-in over node:sqlite, so route tests run in
// plain Node with the real migrations. Covers prepare/bind/first/all/run/batch.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

class Stmt {
  constructor(private db: DatabaseSync, private sql: string, private params: SQLInputValue[] = []) {}
  bind(...params: unknown[]) {
    return new Stmt(this.db, this.sql, params.map((p) => (p === undefined ? null : p)) as SQLInputValue[]);
  }
  async first<T>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (col ? row[col] : { ...row }) as T;
  }
  async all<T>() {
    const rows = this.db.prepare(this.sql).all(...this.params) as T[];
    return { results: rows.map((r) => ({ ...r })), success: true, meta: {} };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.params);
    return { success: true, results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export function createTestD1(): D1Database {
  const db = new DatabaseSync(':memory:');
  const dir = join(import.meta.dirname, '..', 'migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(dir, f), 'utf8'));
  }
  const d1 = {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(stmts: Stmt[]) {
      db.exec('BEGIN');
      try {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    exec: async (sql: string) => { db.exec(sql); return { count: 0, duration: 0 }; },
    raw: db,
  };
  return d1 as unknown as D1Database;
}

export function createTestR2(): R2Bucket {
  const store = new Map<string, Uint8Array>();
  return {
    async put(key: string, value: ArrayBuffer | Uint8Array) {
      store.set(key, value instanceof Uint8Array ? value : new Uint8Array(value));
      return { key } as R2Object;
    },
    async get(key: string) {
      const v = store.get(key);
      if (!v) return null;
      return { key, body: new Blob([v]).stream(), arrayBuffer: async () => v.buffer } as unknown as R2ObjectBody;
    },
    async delete(key: string) { store.delete(key); },
  } as unknown as R2Bucket;
}
