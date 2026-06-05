import type { Transaction, TransactionDraft } from '../../domain/entities/Transaction';
import { BroadcastTransactionUseCase } from '../../domain/usecases/transaction/BroadcastTransactionUseCase';
import { BuildTransactionUseCase } from '../../domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../domain/usecases/transaction/SignTransactionUseCase';

export class TransactionService {
  constructor(
    private readonly buildTransactionUseCase: BuildTransactionUseCase,
    private readonly signTransactionUseCase: SignTransactionUseCase,
    private readonly broadcastTransactionUseCase: BroadcastTransactionUseCase,
  ) {}

  buildTransaction(draft: TransactionDraft): Promise<Transaction> {
    return this.buildTransactionUseCase.execute(draft);
  }

  signTransaction(transaction: Transaction): Promise<Transaction> {
    return this.signTransactionUseCase.execute(transaction);
  }

  broadcastTransaction(transaction: Transaction): Promise<Transaction> {
    return this.broadcastTransactionUseCase.execute(transaction);
  }
}
