import type { Transaction } from '../../domain/entities/Transaction';
import type { Database } from './DatabaseStorage';

type TransactionRow = {
  id: string;
  txid: string | null;
  amount_sats: number;
  fee_sats: number | null;
  direction: string;
  status: string;
  created_at: string;
  address: string | null;
  origin_id: string | null;
  origin_name: string | null;
  replaced_by_txid: string | null;
};

export class TransactionStorage {
  constructor(private readonly db: Database) {}

  async listByWallet(walletId: string): Promise<Transaction[]> {
    const rows = await this.db.execute<TransactionRow>(
      'SELECT id, txid, amount_sats, fee_sats, direction, status, created_at, address, origin_id, origin_name, replaced_by_txid FROM transactions WHERE wallet_id = ? ORDER BY CASE WHEN status = \'pending\' THEN 0 ELSE 1 END ASC, created_at DESC',
      [walletId],
    );
    return rows.map(row => ({
      // Return txid as the canonical id; fall back to original id for drafts with no txid
      id: row.txid ?? row.id,
      txid: row.txid ?? undefined,
      amountSats: row.amount_sats,
      feeSats: row.fee_sats ?? undefined,
      direction: row.direction as Transaction['direction'],
      status: row.status as Transaction['status'],
      createdAt: row.created_at,
      address: row.address ?? undefined,
      originId: row.origin_id ?? undefined,
      originName: row.origin_name ?? undefined,
      replacedByTxid: row.replaced_by_txid ?? undefined,
    }));
  }

  async save(walletId: string, transaction: Transaction): Promise<void> {
    // Wallet-scoped row id: prevents PRIMARY KEY collisions when two wallets
    // share the same private key (and thus the same Bitcoin txids).
    const rowId = `${walletId}:${transaction.txid ?? transaction.id}`;
    await this.db.execute(
      `INSERT OR REPLACE INTO transactions (id, wallet_id, txid, amount_sats, fee_sats, direction, status, created_at, address, origin_id, origin_name, replaced_by_txid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rowId,
        walletId,
        transaction.txid ?? null,
        transaction.amountSats,
        transaction.feeSats ?? null,
        transaction.direction,
        transaction.status,
        transaction.createdAt,
        transaction.address ?? null,
        transaction.originId ?? null,
        transaction.originName ?? null,
        transaction.replacedByTxid ?? null,
      ],
    );
  }

  async deleteByWallet(walletId: string): Promise<void> {
    await this.db.execute('DELETE FROM transactions WHERE wallet_id = ?', [walletId]);
  }
}
