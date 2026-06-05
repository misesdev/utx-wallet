import { open, type DB } from '@op-engineering/op-sqlite';
import { AppError } from '../../application/errors/AppError';

export type QueryRow = Record<string, string | number | null>;

export interface Database {
  execute<T extends QueryRow>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

export class OpSQLiteDatabase implements Database {
  private db: DB | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly name: string) {}

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const db = open({ name: this.name });
    await db.execute(`
      CREATE TABLE IF NOT EXISTS utxos (
        txid TEXT NOT NULL,
        vout INTEGER NOT NULL,
        value_sats INTEGER NOT NULL,
        address TEXT NOT NULL,
        is_confirmed INTEGER NOT NULL DEFAULT 0,
        wallet_id TEXT NOT NULL,
        PRIMARY KEY (txid, vout)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        wallet_id TEXT NOT NULL,
        txid TEXT,
        amount_sats INTEGER NOT NULL,
        fee_sats INTEGER,
        direction TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    this.db = db;
  }

  async execute<T extends QueryRow>(sql: string, params?: (string | number | null)[]): Promise<T[]> {
    await this.initialize();
    if (!this.db) throw new AppError('Database not initialized', 'DB_NOT_INITIALIZED');
    const result = await this.db.execute(sql, params as Parameters<DB['execute']>[1]);
    return result.rows as unknown as T[];
  }
}
