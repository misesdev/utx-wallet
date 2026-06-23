import type { BitcoinNetwork } from '../../entities/Network';
import type { Transaction } from '../../entities/Transaction';
import type { TransactionDetail } from '../../entities/TransactionDetail';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BlockchainExplorer } from '../../repositories/BlockchainExplorer';
import type { TransactionRepository } from '../../repositories/TransactionRepository';

export type GetTransactionDetailParams = {
  transaction: Transaction;
  network: BitcoinNetwork;
  walletId?: string;
};

export class GetTransactionDetailUseCase {
  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    private readonly explorer: BlockchainExplorer,
    private readonly transactionRepository: TransactionRepository | null = null,
  ) {}

  async execute(params: GetTransactionDetailParams): Promise<TransactionDetail> {
    const { transaction, network, walletId } = params;

    let blockHeight: number | undefined;
    let blockTime: number | undefined;
    let confirmations: number | undefined;
    let isConfirmed = transaction.status === 'confirmed';
    let statusChanged = false;

    if (transaction.txid && transaction.status !== 'replaced') {
      try {
        const [status, currentHeight] = await Promise.all([
          this.blockchainProvider.getTransactionStatus(transaction.txid),
          this.blockchainProvider.getCurrentBlockHeight(),
        ]);
        const wasConfirmed = transaction.status === 'confirmed';
        isConfirmed = status.confirmed;
        statusChanged = !wasConfirmed && isConfirmed;
        blockHeight = status.blockHeight;
        blockTime = status.blockTime;
        if (status.confirmed && status.blockHeight !== undefined) {
          confirmations = Math.max(1, currentHeight - status.blockHeight + 1);
        }
      } catch {
        // Use local status if remote fetch fails
      }
    }

    // Persist status change (pending → confirmed) so the home screen reflects it immediately.
    if (statusChanged && walletId && this.transactionRepository) {
      const updated: Transaction = { ...transaction, status: 'confirmed' };
      await this.transactionRepository.upsertAll(walletId, [updated]).catch(() => {});
    }

    const explorerUrl = transaction.txid
      ? this.explorer.getExplorerUrl(transaction.txid, network)
      : '';

    return {
      ...transaction,
      status: isConfirmed ? 'confirmed' : transaction.status,
      blockHeight,
      blockTime,
      confirmations,
      isConfirmed,
      explorerUrl,
    };
  }
}
