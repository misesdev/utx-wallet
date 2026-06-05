import type { Transaction, TransactionDraft } from '../../entities/Transaction';
import type { TransactionRepository } from '../../repositories/TransactionRepository';

export class BuildTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  execute(draft: TransactionDraft): Promise<Transaction> {
    return this.transactionRepository.build(draft);
  }
}
