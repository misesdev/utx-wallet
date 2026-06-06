import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { Transaction } from '../../domain/entities/Transaction';
import type { TransactionDetail } from '../../domain/entities/TransactionDetail';
import { GetTransactionDetailUseCase } from '../../domain/usecases/transaction/GetTransactionDetailUseCase';

export class TransactionHistoryService {
  constructor(
    private readonly getDetailUseCase: GetTransactionDetailUseCase,
  ) {}

  getDetail(transaction: Transaction, network: BitcoinNetwork): Promise<TransactionDetail> {
    return this.getDetailUseCase.execute({ transaction, network });
  }
}
