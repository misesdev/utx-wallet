import type { TransactionRepository } from '../../repositories/TransactionRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../entities/Network';
import type { Transaction } from '../../entities/Transaction';
import type { WalletAddress } from '../../entities/WalletAddress';
import { delay } from '../../../../shared/utils/asyncUtils';
import type { OnSyncProgress } from './SyncProgress';

export type SyncTransactionsResult = {
  newCount: number;
  fetchedTransactions: Map<string, Transaction[]>;
};

export type SyncTransactionsOpts = {
  parallel?: boolean;
  requestDelayMs?: number;
};

export class SyncTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly requestDelayMs = 0,
  ) {}

  async execute(
    walletId: string,
    addresses: string[],
    network: BitcoinNetwork,
    addressMetadata: Map<string, Pick<WalletAddress, 'originId' | 'originName'>> = new Map(),
    onProgress?: OnSyncProgress,
    opts?: SyncTransactionsOpts,
  ): Promise<SyncTransactionsResult> {
    const parallel = opts?.parallel ?? false;
    const delayMs = opts?.requestDelayMs ?? this.requestDelayMs;

    const localTxs = await this.transactionRepository.list(walletId);

    const fetchedTransactions = new Map<string, Transaction[]>();

    const fetchForAddress = async (address: string, i: number): Promise<void> => {
      onProgress?.({ currentAddress: address, currentIndex: i, totalAddresses: addresses.length, phase: 'transactions' });
      const metadata = addressMetadata.get(address);
      const txs = (await this.blockchainProvider.getTransactions(address, network)).map(tx => ({
        ...tx,
        address,
        ...(metadata?.originId ?? tx.originId ? { originId: metadata?.originId ?? tx.originId } : {}),
        ...(metadata?.originName ?? tx.originName ? { originName: metadata?.originName ?? tx.originName } : {}),
      }));
      fetchedTransactions.set(address, txs);
    };

    if (parallel) {
      await Promise.all(addresses.map((addr, i) => fetchForAddress(addr, i)));
    } else {
      for (let i = 0; i < addresses.length; i++) {
        await fetchForAddress(addresses[i], i);
        if (i < addresses.length - 1) {
          await delay(delayMs);
        }
      }
    }

    // Merge per-address results into one canonical transaction per txid.
    // When the same tx appears as outgoing (spending address) AND incoming (change address),
    // we subtract the change to get the actual net amount sent rather than the full UTXO value.
    const txMap = new Map<string, Transaction>();
    for (const txs of fetchedTransactions.values()) {
      for (const tx of txs) {
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
    }
    const freshTxs = Array.from(txMap.values());

    const localKeys = new Set(localTxs.map(tx => tx.txid ?? tx.id));
    const newCount = freshTxs.filter(tx => !localKeys.has(tx.txid ?? tx.id)).length;

    // Resolve direction conflicts against locally-stored transactions.
    // This handles the cross-iteration case: when the spending address is synced in one
    // iteration and the change address is discovered and synced in the next, the second
    // iteration's upsertAll would otherwise overwrite the first with the wrong direction.
    const localTxByKey = new Map(localTxs.map(tx => [tx.txid ?? tx.id, tx]));
    const resolvedTxs = freshTxs.map(freshTx => {
      const key = freshTx.txid ?? freshTx.id;
      const localTx = localTxByKey.get(key);
      if (localTx && localTx.direction !== freshTx.direction) {
        const outgoing = localTx.direction === 'outgoing' ? localTx : freshTx;
        const incoming = localTx.direction === 'incoming' ? localTx : freshTx;
        return { ...outgoing, amountSats: Math.max(0, outgoing.amountSats - incoming.amountSats) };
      }
      return freshTx;
    });

    await this.transactionRepository.upsertAll(walletId, resolvedTxs);

    return { newCount, fetchedTransactions };
  }
}
