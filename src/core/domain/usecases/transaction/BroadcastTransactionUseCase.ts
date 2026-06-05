import type { Transaction } from '../../entities/Transaction';
import type { TransactionRepository } from '../../repositories/TransactionRepository';

export class BroadcastTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  execute(transaction: Transaction): Promise<Transaction> {
    return this.transactionRepository.broadcast(transaction);
  }
}
