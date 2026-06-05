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
};

export class TransactionStorage {
  constructor(private readonly db: Database) {}

  async listByWallet(walletId: string): Promise<Transaction[]> {
    const rows = await this.db.execute<TransactionRow>(
      'SELECT id, txid, amount_sats, fee_sats, direction, status, created_at FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC',
      [walletId],
    );
    return rows.map(row => ({
      id: row.id,
      txid: row.txid ?? undefined,
      amountSats: row.amount_sats,
      feeSats: row.fee_sats ?? undefined,
      direction: row.direction as Transaction['direction'],
      status: row.status as Transaction['status'],
      createdAt: row.created_at,
    }));
  }

  async save(walletId: string, transaction: Transaction): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO transactions (id, wallet_id, txid, amount_sats, fee_sats, direction, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        walletId,
        transaction.txid ?? null,
        transaction.amountSats,
        transaction.feeSats ?? null,
        transaction.direction,
        transaction.status,
        transaction.createdAt,
      ],
    );
  }
}
