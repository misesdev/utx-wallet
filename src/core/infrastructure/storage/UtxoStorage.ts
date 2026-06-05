import type { Utxo } from '../../domain/entities/Utxo';
import type { Database } from './DatabaseStorage';

type UtxoRow = {
  txid: string;
  vout: number;
  value_sats: number;
  address: string;
  is_confirmed: number;
};

export class UtxoStorage {
  constructor(private readonly db: Database) {}

  async load(walletId: string): Promise<Utxo[]> {
    const rows = await this.db.execute<UtxoRow>(
      'SELECT txid, vout, value_sats, address, is_confirmed FROM utxos WHERE wallet_id = ?',
      [walletId],
    );
    return rows.map(row => ({
      txid: row.txid,
      vout: row.vout,
      valueSats: row.value_sats,
      address: row.address,
      isConfirmed: row.is_confirmed === 1,
    }));
  }

  async save(walletId: string, utxos: Utxo[]): Promise<void> {
    await this.db.execute('DELETE FROM utxos WHERE wallet_id = ?', [walletId]);
    for (const utxo of utxos) {
      await this.db.execute(
        'INSERT INTO utxos (txid, vout, value_sats, address, is_confirmed, wallet_id) VALUES (?, ?, ?, ?, ?, ?)',
        [utxo.txid, utxo.vout, utxo.valueSats, utxo.address, utxo.isConfirmed ? 1 : 0, walletId],
      );
    }
  }
}
