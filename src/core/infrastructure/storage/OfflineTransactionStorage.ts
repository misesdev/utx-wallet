import type { OfflineTransaction } from '../../domain/entities/OfflineTransaction';
import type { Database } from './DatabaseStorage';

type OfflineTxRow = {
  id: string;
  wallet_id: string;
  raw_hex: string;
  txid: string | null;
  amount_sats: number | null;
  fee_sats: number | null;
  to_address: string | null;
  created_at: string;
};

export class OfflineTransactionStorage {
  constructor(private readonly db: Database) {}

  async list(walletId: string): Promise<OfflineTransaction[]> {
    const rows = await this.db.execute<OfflineTxRow>(
      'SELECT id, wallet_id, raw_hex, txid, amount_sats, fee_sats, to_address, created_at FROM offline_transactions WHERE wallet_id = ? ORDER BY created_at DESC',
      [walletId],
    );
    return rows.map(row => ({
      id: row.id,
      walletId: row.wallet_id,
      rawHex: row.raw_hex,
      txid: row.txid ?? undefined,
      amountSats: row.amount_sats ?? undefined,
      feeSats: row.fee_sats ?? undefined,
      toAddress: row.to_address ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async save(tx: OfflineTransaction): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO offline_transactions
         (id, wallet_id, raw_hex, txid, amount_sats, fee_sats, to_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.walletId,
        tx.rawHex,
        tx.txid ?? null,
        tx.amountSats ?? null,
        tx.feeSats ?? null,
        tx.toAddress ?? null,
        tx.createdAt,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM offline_transactions WHERE id = ?', [id]);
  }
}
