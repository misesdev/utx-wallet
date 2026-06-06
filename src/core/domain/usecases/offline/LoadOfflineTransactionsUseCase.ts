import type { OfflineTransaction } from '../../entities/OfflineTransaction';
import type { OfflineTransactionRepository } from '../../repositories/OfflineTransactionRepository';

export class LoadOfflineTransactionsUseCase {
  constructor(private readonly repository: OfflineTransactionRepository) {}

  execute(walletId: string): Promise<OfflineTransaction[]> {
    return this.repository.list(walletId);
  }
}
