import type { AddressStatus } from '../../entities/WalletAddress';
import type { BitcoinNetwork } from '../../entities/Network';
import type { Transaction } from '../../entities/Transaction';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { EnsureAddressPoolUseCase } from './EnsureAddressPoolUseCase';

export class SyncAddressStatusUseCase {
  constructor(
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly originRepository: AddressOriginRepository,
    private readonly utxoRepository: UtxoRepository,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly ensureAddressPool: EnsureAddressPoolUseCase,
  ) {}

  async execute(
    walletId: string,
    network: BitcoinNetwork,
    prefetchedTransactions?: Map<string, Transaction[]>,
  ): Promise<void> {
    const addresses = await this.walletAddressRepository.findByWallet(walletId);
    if (addresses.length === 0) return;

    // Build address → hasUtxos from local UTXO state (synced by SyncUtxosUseCase)
    const utxos = await this.utxoRepository.listByWallet(walletId);
    const addressesWithUtxos = new Set(utxos.map(u => u.address));

    const now = new Date().toISOString();

    for (const walletAddr of addresses) {
      if (walletAddr.status === 'archived') continue;

      // When a prefetch map is provided, skip addresses absent from it.
      // Prevents N extra blockchain calls when only a subset of addresses are being synced.
      if (prefetchedTransactions && !prefetchedTransactions.has(walletAddr.address)) continue;

      const txs = prefetchedTransactions?.get(walletAddr.address)
        ?? await this.blockchainProvider.getTransactions(walletAddr.address, network);

      const incomingTxs = txs.filter(t => t.direction === 'incoming');
      const outgoingTxs = txs.filter(t => t.direction === 'outgoing');

      const txCount = txs.length;
      const incomingTxCount = incomingTxs.length;
      const outgoingTxCount = outgoingTxs.length;
      const totalReceivedSats = incomingTxs.reduce((s, t) => s + t.amountSats, 0);
      const totalSentSats = outgoingTxs.reduce((s, t) => s + t.amountSats, 0);
      const hasUtxos = addressesWithUtxos.has(walletAddr.address);

      const status = this.computeStatus(walletAddr.status, walletAddr.chain, txCount, outgoingTxCount, hasUtxos);

      await this.walletAddressRepository.updateSyncData(walletAddr.id, {
        status,
        txCount,
        incomingTxCount,
        outgoingTxCount,
        totalReceivedSats,
        totalSentSats,
        hasUtxos,
        lastSyncedAt: now,
      });
    }

    // Replenish pool after sync in case newly received addresses reduced fresh count
    await this.ensureAddressPool.execute(walletId, network);
  }

  private computeStatus(
    current: AddressStatus,
    chain: 'receive' | 'change',
    txCount: number,
    outgoingTxCount: number,
    hasUtxos: boolean,
  ): AddressStatus {
    if (txCount === 0) {
      // A reserved address with no blockchain activity means the transaction that
      // reserved it was never broadcast (or was replaced). Release it back to fresh
      // so it can be reused — leaving it reserved permanently would create phantom
      // gaps that stop wallet-import discovery before the real balances are found.
      return 'fresh';
    }
    if (outgoingTxCount > 0 && hasUtxos) {
      return 'inconsistent';
    }
    if (outgoingTxCount > 0) {
      return chain === 'change' ? 'change' : 'spent_once';
    }
    // Only incoming transactions
    return chain === 'change' ? 'change' : 'received';
  }
}
