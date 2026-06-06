import type { Transaction } from '../../entities/Transaction';
import type { TransactionRepository } from '../../repositories/TransactionRepository';

export class LoadTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  execute(walletId: string): Promise<Transaction[]> {
    return this.transactionRepository.list(walletId);
  }
}
