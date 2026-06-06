import type { OfflineTransaction } from '../../domain/entities/OfflineTransaction';
import type { OfflineTransactionRepository } from '../../domain/repositories/OfflineTransactionRepository';
import { OfflineTransactionStorage } from '../storage/OfflineTransactionStorage';

export class OfflineTransactionRepositoryImpl implements OfflineTransactionRepository {
  constructor(private readonly storage: OfflineTransactionStorage) {}

  save(tx: OfflineTransaction): Promise<void> {
    return this.storage.save(tx);
  }

  list(walletId: string): Promise<OfflineTransaction[]> {
    return this.storage.list(walletId);
  }

  delete(id: string): Promise<void> {
    return this.storage.delete(id);
  }
}
