import type { Utxo } from '../../domain/entities/Utxo';
import type { Database } from './DatabaseStorage';

type UtxoRow = {
  txid: string;
  vout: number;
  value_sats: number;
  address: string;
  is_confirmed: number;
  is_frozen: number;
};

export class UtxoStorage {
  constructor(private readonly db: Database) {}

  async load(walletId: string): Promise<Utxo[]> {
    const rows = await this.db.execute<UtxoRow>(
      'SELECT txid, vout, value_sats, address, is_confirmed, is_frozen FROM utxos WHERE wallet_id = ?',
      [walletId],
    );
    return rows.map(row => ({
      txid: row.txid,
      vout: row.vout,
      valueSats: row.value_sats,
      address: row.address,
      isConfirmed: row.is_confirmed === 1,
      isFrozen: row.is_frozen === 1,
    }));
  }

  async save(walletId: string, utxos: Utxo[]): Promise<void> {
    await this.db.execute('DELETE FROM utxos WHERE wallet_id = ?', [walletId]);
    for (const utxo of utxos) {
      await this.db.execute(
        'INSERT INTO utxos (txid, vout, value_sats, address, is_confirmed, is_frozen, wallet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [utxo.txid, utxo.vout, utxo.valueSats, utxo.address, utxo.isConfirmed ? 1 : 0, utxo.isFrozen ? 1 : 0, walletId],
      );
    }
  }

  async freeze(walletId: string, txid: string, vout: number): Promise<void> {
    await this.db.execute(
      'UPDATE utxos SET is_frozen = 1 WHERE wallet_id = ? AND txid = ? AND vout = ?',
      [walletId, txid, vout],
    );
  }

  async unfreeze(walletId: string, txid: string, vout: number): Promise<void> {
    await this.db.execute(
      'UPDATE utxos SET is_frozen = 0 WHERE wallet_id = ? AND txid = ? AND vout = ?',
      [walletId, txid, vout],
    );
  }
}
