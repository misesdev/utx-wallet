import type { BuiltTransaction } from '../../domain/entities/BuiltTransaction';
import type { SignedTransaction } from '../../domain/entities/SignedTransaction';
import type { BuildTransactionParams } from '../../domain/usecases/transaction/BuildTransactionUseCase';
import type { SignTransactionParams } from '../../domain/usecases/transaction/SignTransactionUseCase';
import type { BroadcastResult } from '../../domain/usecases/transaction/BroadcastTransactionUseCase';
import { BuildTransactionUseCase } from '../../domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../domain/usecases/transaction/SignTransactionUseCase';
import { BroadcastTransactionUseCase } from '../../domain/usecases/transaction/BroadcastTransactionUseCase';

export class TransactionService {
  constructor(
    private readonly buildTransactionUseCase: BuildTransactionUseCase,
    private readonly signTransactionUseCase: SignTransactionUseCase,
    private readonly broadcastTransactionUseCase: BroadcastTransactionUseCase,
  ) {}

  buildTransaction(params: BuildTransactionParams): Promise<BuiltTransaction> {
    return this.buildTransactionUseCase.execute(params);
  }

  signTransaction(params: SignTransactionParams): Promise<SignedTransaction> {
    return this.signTransactionUseCase.execute(params);
  }

  broadcastTransaction(signed: SignedTransaction, walletId: string): Promise<BroadcastResult> {
    return this.broadcastTransactionUseCase.execute(signed, walletId);
  }
}
