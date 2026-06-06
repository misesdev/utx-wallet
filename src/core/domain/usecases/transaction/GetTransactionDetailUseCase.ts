import type { BitcoinNetwork } from '../../entities/Network';
import type { Transaction } from '../../entities/Transaction';
import type { TransactionDetail } from '../../entities/TransactionDetail';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BlockchainExplorer } from '../../repositories/BlockchainExplorer';

export type GetTransactionDetailParams = {
  transaction: Transaction;
  network: BitcoinNetwork;
};

export class GetTransactionDetailUseCase {
  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    private readonly explorer: BlockchainExplorer,
  ) {}

  async execute(params: GetTransactionDetailParams): Promise<TransactionDetail> {
    const { transaction, network } = params;

    let blockHeight: number | undefined;
    let blockTime: number | undefined;
    let confirmations: number | undefined;
    let isConfirmed = transaction.status === 'confirmed';

    if (transaction.txid) {
      try {
        const [status, currentHeight] = await Promise.all([
          this.blockchainProvider.getTransactionStatus(transaction.txid),
          this.blockchainProvider.getCurrentBlockHeight(),
        ]);
        isConfirmed = status.confirmed;
        blockHeight = status.blockHeight;
        blockTime = status.blockTime;
        if (status.confirmed && status.blockHeight !== undefined) {
          confirmations = Math.max(1, currentHeight - status.blockHeight + 1);
        }
      } catch {
        // Use local status if remote fetch fails
      }
    }

    const explorerUrl = transaction.txid
      ? this.explorer.getExplorerUrl(transaction.txid, network)
      : '';

    return {
      ...transaction,
      blockHeight,
      blockTime,
      confirmations,
      isConfirmed,
      explorerUrl,
    };
  }
}
