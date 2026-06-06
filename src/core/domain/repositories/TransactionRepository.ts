import type { Transaction, TransactionDraft } from '../entities/Transaction';

export interface TransactionRepository {
  build(draft: TransactionDraft): Promise<Transaction>;
  sign(transaction: Transaction): Promise<Transaction>;
  broadcast(transaction: Transaction): Promise<Transaction>;
  list(walletId: string): Promise<Transaction[]>;
  upsertAll(walletId: string, transactions: Transaction[]): Promise<void>;
}
