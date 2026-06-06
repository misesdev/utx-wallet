import type { OfflineTransaction } from '../entities/OfflineTransaction';

export interface OfflineTransactionRepository {
  save(tx: OfflineTransaction): Promise<void>;
  list(walletId: string): Promise<OfflineTransaction[]>;
  delete(id: string): Promise<void>;
}
