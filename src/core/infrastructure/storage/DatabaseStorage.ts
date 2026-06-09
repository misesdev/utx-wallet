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

    // Schema version tracking
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL DEFAULT 0
      )
    `);
    const versionResult = await db.execute('SELECT version FROM schema_version LIMIT 1');
    const versionRows = versionResult.rows as Array<{ version: number }>;
    let currentVersion: number;
    if (versionRows.length === 0) {
      await db.execute('INSERT INTO schema_version (version) VALUES (0)');
      currentVersion = 0;
    } else {
      currentVersion = versionRows[0].version;
    }

    // Base tables (idempotent — IF NOT EXISTS)
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
        created_at TEXT NOT NULL,
        address TEXT,
        origin_id TEXT,
        origin_name TEXT
      )
    `);
    for (const column of [
      'address TEXT',
      'origin_id TEXT',
      'origin_name TEXT',
    ]) {
      try {
        await db.execute(`ALTER TABLE transactions ADD COLUMN ${column}`);
      } catch {
        // Column already exists on existing databases — safe to ignore
      }
    }
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

    // Run pending migrations
    await this.migrate(currentVersion);
  }

  private async migrate(fromVersion: number): Promise<void> {
    if (!this.db) return;
    let version = fromVersion;

    if (version < 1) {
      // Migration 1: change utxos PRIMARY KEY from (txid, vout) to (wallet_id, txid, vout)
      // so two wallets with the same private key can each have their own UTXOs.
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS utxos_v1 (
          txid TEXT NOT NULL,
          vout INTEGER NOT NULL,
          value_sats INTEGER NOT NULL,
          address TEXT NOT NULL,
          is_confirmed INTEGER NOT NULL DEFAULT 0,
          is_frozen INTEGER NOT NULL DEFAULT 0,
          wallet_id TEXT NOT NULL,
          PRIMARY KEY (wallet_id, txid, vout)
        )
      `);
      await this.db.execute(`
        INSERT OR IGNORE INTO utxos_v1 (txid, vout, value_sats, address, is_confirmed, is_frozen, wallet_id)
        SELECT txid, vout, value_sats, address, is_confirmed, is_frozen, wallet_id FROM utxos
      `);
      await this.db.execute('DROP TABLE utxos');
      await this.db.execute('ALTER TABLE utxos_v1 RENAME TO utxos');

      // Migration 1 also: update transaction IDs to wallet-scoped format so the same
      // Bitcoin txid can exist for multiple wallets without PRIMARY KEY collision.
      // New format: "<wallet_id>:<txid>". Rows already in new format are left untouched.
      await this.db.execute(`
        UPDATE transactions
        SET id = wallet_id || ':' || COALESCE(txid, id)
        WHERE id NOT LIKE '%:%'
      `);

      version = 1;
      await this.db.execute('UPDATE schema_version SET version = 1');
    }

    // Future migrations go here as: if (version < 2) { ... version = 2; }
  }

  async execute<T extends QueryRow>(sql: string, params?: (string | number | null)[]): Promise<T[]> {
    await this.initialize();
    if (!this.db) throw new AppError('Database not initialized', 'DB_NOT_INITIALIZED');
    const result = await this.db.execute(sql, params as Parameters<DB['execute']>[1]);
    return result.rows as unknown as T[];
  }
}
