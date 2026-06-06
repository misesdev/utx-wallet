import type { OfflineTransaction } from '../../entities/OfflineTransaction';
import type { OfflineTransactionRepository } from '../../repositories/OfflineTransactionRepository';

export class SaveOfflineTransactionUseCase {
  constructor(private readonly repository: OfflineTransactionRepository) {}

  execute(tx: OfflineTransaction): Promise<void> {
    return this.repository.save(tx);
  }
}
