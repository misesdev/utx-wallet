import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { Transaction } from '../../domain/entities/Transaction';
import type { TransactionDetail } from '../../domain/entities/TransactionDetail';
import type { RawTransaction } from '../../domain/repositories/BlockchainProvider';
import type { BlockchainProvider } from '../../domain/repositories/BlockchainProvider';
import { GetTransactionDetailUseCase } from '../../domain/usecases/transaction/GetTransactionDetailUseCase';

export class TransactionHistoryService {
  constructor(
    private readonly getDetailUseCase: GetTransactionDetailUseCase,
    private readonly blockchainProvider?: BlockchainProvider,
  ) {}

  getDetail(transaction: Transaction, network: BitcoinNetwork, walletId?: string): Promise<TransactionDetail> {
    return this.getDetailUseCase.execute({ transaction, network, walletId });
  }

  getRawTransaction(txid: string): Promise<RawTransaction> {
    if (!this.blockchainProvider) {
      return Promise.reject(new Error('No blockchain provider configured'));
    }
    return this.blockchainProvider.getRawTransaction(txid);
  }
}
