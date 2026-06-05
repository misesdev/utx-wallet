import type { Transaction } from '../../entities/Transaction';
import type { TransactionRepository } from '../../repositories/TransactionRepository';

export class SignTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  execute(transaction: Transaction): Promise<Transaction> {
    return this.transactionRepository.sign(transaction);
  }
}
