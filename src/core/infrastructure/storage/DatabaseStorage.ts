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
        is_frozen INTEGER NOT NULL DEFAULT 0,
        wallet_id TEXT NOT NULL,
        PRIMARY KEY (txid, vout)
      )
    `);
    try {
      await db.execute('ALTER TABLE utxos ADD COLUMN is_frozen INTEGER NOT NULL DEFAULT 0');
    } catch {
      // Column already exists on existing databases — safe to ignore
    }
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY NOT NULL,
        wallet_id TEXT NOT NULL,
        value TEXT NOT NULL,
        network TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'p2wpkh',
        is_change INTEGER NOT NULL DEFAULT 0,
        index_num INTEGER NOT NULL,
        is_used INTEGER NOT NULL DEFAULT 0
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS offline_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        wallet_id TEXT NOT NULL,
        raw_hex TEXT NOT NULL,
        txid TEXT,
        amount_sats INTEGER,
        fee_sats INTEGER,
        to_address TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS address_origins (
        id TEXT PRIMARY KEY NOT NULL,
        wallet_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'custom',
        account_index INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        archived_at TEXT
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS wallet_addresses (
        id TEXT PRIMARY KEY NOT NULL,
        wallet_id TEXT NOT NULL,
        origin_id TEXT NOT NULL,
        origin_name TEXT NOT NULL,
        address TEXT NOT NULL,
        path TEXT NOT NULL,
        account_index INTEGER NOT NULL,
        chain TEXT NOT NULL,
        index_num INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'fresh',
        total_received_sats INTEGER NOT NULL DEFAULT 0,
        total_sent_sats INTEGER NOT NULL DEFAULT 0,
        tx_count INTEGER NOT NULL DEFAULT 0,
        incoming_tx_count INTEGER NOT NULL DEFAULT 0,
        outgoing_tx_count INTEGER NOT NULL DEFAULT 0,
        has_utxos INTEGER NOT NULL DEFAULT 0,
        is_frozen INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        used_at TEXT,
        last_synced_at TEXT
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
