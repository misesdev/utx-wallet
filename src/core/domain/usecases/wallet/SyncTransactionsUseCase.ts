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

    // Merge per-address results into one canonical transaction per txid.
    // When the same tx appears as outgoing (spending address) AND incoming (change address),
    // we subtract the change to get the actual net amount sent rather than the full UTXO value.
    const txMap = new Map<string, Transaction>();
    for (const tx of freshTxLists.flat()) {
      const key = tx.txid ?? tx.id;
      const existing = txMap.get(key);
      if (!existing) {
        txMap.set(key, tx);
        continue;
      }
      if (existing.direction !== tx.direction) {
        // Outgoing tx seen from spending address + incoming from change address → net sent amount
        const outgoing = existing.direction === 'outgoing' ? existing : tx;
        const incoming = existing.direction === 'incoming' ? existing : tx;
        txMap.set(key, { ...outgoing, amountSats: Math.max(0, outgoing.amountSats - incoming.amountSats) });
      }
      // Same direction: keep first (true duplicate or multi-address receive handled per-address)
    }
    const freshTxs = Array.from(txMap.values());

    const localKeys = new Set(localTxs.map(tx => tx.txid ?? tx.id));
    const newCount = freshTxs.filter(tx => !localKeys.has(tx.txid ?? tx.id)).length;

    await this.transactionRepository.upsertAll(walletId, freshTxs);

    return { newCount };
  }
}
