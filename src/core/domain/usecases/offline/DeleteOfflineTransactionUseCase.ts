import type { OfflineTransactionRepository } from '../../repositories/OfflineTransactionRepository';

export class DeleteOfflineTransactionUseCase {
  constructor(private readonly repository: OfflineTransactionRepository) {}

  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
