import type { AddressOrigin } from '../../domain/entities/AddressOrigin';
import type { Database } from './DatabaseStorage';

type OriginRow = {
  id: string;
  wallet_id: string;
  name: string;
  type: string;
  account_index: number;
  created_at: string;
  archived_at: string | null;
};

export class AddressOriginStorage {
  constructor(private readonly db: Database) {}

  async findByWallet(walletId: string): Promise<AddressOrigin[]> {
    const rows = await this.db.execute<OriginRow>(
      'SELECT id, wallet_id, name, type, account_index, created_at, archived_at FROM address_origins WHERE wallet_id = ?',
      [walletId],
    );
    return rows.map(this.mapRow);
  }

  async findById(id: string): Promise<AddressOrigin | null> {
    const rows = await this.db.execute<OriginRow>(
      'SELECT id, wallet_id, name, type, account_index, created_at, archived_at FROM address_origins WHERE id = ?',
      [id],
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async findDefault(walletId: string): Promise<AddressOrigin | null> {
    const rows = await this.db.execute<OriginRow>(
      "SELECT id, wallet_id, name, type, account_index, created_at, archived_at FROM address_origins WHERE wallet_id = ? AND type = 'default' LIMIT 1",
      [walletId],
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getMaxAccountIndex(walletId: string): Promise<number> {
    const rows = await this.db.execute<OriginRow>(
      'SELECT account_index FROM address_origins WHERE wallet_id = ?',
      [walletId],
    );
    if (rows.length === 0) return -1;
    return Math.max(...rows.map(r => r.account_index));
  }

  async save(origin: AddressOrigin): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO address_origins
        (id, wallet_id, name, type, account_index, created_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        origin.id,
        origin.walletId,
        origin.name,
        origin.type,
        origin.accountIndex,
        origin.createdAt,
        origin.archivedAt,
      ],
    );
  }

  async archive(id: string): Promise<void> {
    await this.db.execute(
      'UPDATE address_origins SET archived_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  }

  async deleteByWallet(walletId: string): Promise<void> {
    await this.db.execute('DELETE FROM address_origins WHERE wallet_id = ?', [walletId]);
  }

  private mapRow(row: OriginRow): AddressOrigin {
    return {
      id: row.id,
      walletId: row.wallet_id,
      name: row.name,
      type: row.type as AddressOrigin['type'],
      accountIndex: row.account_index,
      createdAt: row.created_at,
      archivedAt: row.archived_at,
    };
  }
}
