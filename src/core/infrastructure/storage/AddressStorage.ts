import type { Address } from '../../domain/entities/Address';
import type { Database } from './DatabaseStorage';

type AddressRow = {
  id: string;
  wallet_id: string;
  value: string;
  network: string;
  type: string;
  is_change: number;
  index_num: number;
  is_used: number;
};

export class AddressStorage {
  constructor(private readonly db: Database) {}

  async listByWallet(walletId: string): Promise<Address[]> {
    const rows = await this.db.execute<AddressRow>(
      'SELECT id, wallet_id, value, network, type, is_change, index_num, is_used FROM addresses WHERE wallet_id = ? ORDER BY index_num ASC',
      [walletId],
    );
    return rows.map(this.toEntity);
  }

  async listReceiveByWallet(walletId: string): Promise<Address[]> {
    const rows = await this.db.execute<AddressRow>(
      'SELECT id, wallet_id, value, network, type, is_change, index_num, is_used FROM addresses WHERE wallet_id = ? AND is_change = 0 ORDER BY index_num ASC',
      [walletId],
    );
    return rows.map(this.toEntity);
  }

  async listChangeByWallet(walletId: string): Promise<Address[]> {
    const rows = await this.db.execute<AddressRow>(
      'SELECT id, wallet_id, value, network, type, is_change, index_num, is_used FROM addresses WHERE wallet_id = ? AND is_change = 1 ORDER BY index_num ASC',
      [walletId],
    );
    return rows.map(this.toEntity);
  }

  async save(walletId: string, address: Address): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO addresses (id, wallet_id, value, network, type, is_change, index_num, is_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        address.id,
        walletId,
        address.value,
        address.network,
        address.type,
        address.isChange ? 1 : 0,
        address.index,
        address.isUsed ? 1 : 0,
      ],
    );
  }

  async markUsed(addressValue: string): Promise<void> {
    await this.db.execute('UPDATE addresses SET is_used = 1 WHERE value = ?', [addressValue]);
  }

  async deleteByWallet(walletId: string): Promise<void> {
    await this.db.execute('DELETE FROM addresses WHERE wallet_id = ?', [walletId]);
  }

  private toEntity(row: AddressRow): Address {
    return {
      id: row.id,
      accountId: row.wallet_id,
      value: row.value,
      network: row.network as Address['network'],
      type: row.type as Address['type'],
      isChange: row.is_change === 1,
      index: row.index_num,
      isUsed: row.is_used === 1,
    };
  }
}
