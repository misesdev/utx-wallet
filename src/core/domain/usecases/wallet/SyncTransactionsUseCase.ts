import type { TransactionRepository } from '../../repositories/TransactionRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../entities/Network';

export type SyncTransactionsResult = {
  newCount: number;
};

export class SyncTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly blockchainProvider: BlockchainProvider,
  ) {}

  async execute(walletId: string, addresses: string[], network: BitcoinNetwork): Promise<SyncTransactionsResult> {
    const [localTxs, ...freshTxLists] = await Promise.all([
      this.transactionRepository.list(walletId),
      ...addresses.map(addr => this.blockchainProvider.getTransactions(addr, network)),
    ]);

    // A single tx can appear in multiple address results (e.g. send to self), deduplicate by txid
    const seenTxids = new Set<string>();
    const freshTxs = freshTxLists.flat().filter(tx => {
      const key = tx.txid ?? tx.id;
      if (seenTxids.has(key)) return false;
      seenTxids.add(key);
      return true;
    });

    const localKeys = new Set(localTxs.map(tx => tx.txid ?? tx.id));
    const newCount = freshTxs.filter(tx => !localKeys.has(tx.txid ?? tx.id)).length;

    await this.transactionRepository.upsertAll(walletId, freshTxs);

    return { newCount };
  }
}
