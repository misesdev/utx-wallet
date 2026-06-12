import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../entities/Network';
import type { Utxo } from '../../entities/Utxo';
import { delay } from '../../../../shared/utils/asyncUtils';
import type { OnSyncProgress } from './SyncProgress';

export type SyncUtxosResult = {
  newCount: number;
  spentCount: number;
};

export class SyncUtxosUseCase {
  constructor(
    private readonly utxoRepository: UtxoRepository,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly requestDelayMs = 0,
  ) {}

  async execute(
    walletId: string,
    addresses: string[],
    network: BitcoinNetwork,
    onProgress?: OnSyncProgress,
  ): Promise<SyncUtxosResult> {
    const allLocalUtxos = await this.utxoRepository.listByWallet(walletId);
    const syncedAddressSet = new Set(addresses);

    // UTXOs from addresses NOT being synced must be preserved — a partial sync
    // (account or single address) must never wipe UTXOs from other accounts.
    const untouchedUtxos = allLocalUtxos.filter(u => !syncedAddressSet.has(u.address));
    const localSyncedUtxos = allLocalUtxos.filter(u => syncedAddressSet.has(u.address));

    const freshUtxos: Utxo[] = [];
    for (let i = 0; i < addresses.length; i++) {
      onProgress?.({ currentAddress: addresses[i], currentIndex: i, totalAddresses: addresses.length, phase: 'utxos' });
      const utxos = await this.blockchainProvider.getUtxos(addresses[i], network);
      freshUtxos.push(...utxos);
      if (i < addresses.length - 1) {
        await delay(this.requestDelayMs);
      }
    }

    const freshSet = new Set(freshUtxos.map(u => `${u.txid}:${u.vout}`));
    const localSet = new Set(localSyncedUtxos.map(u => `${u.txid}:${u.vout}`));
    const frozenLocalSet = new Set(
      localSyncedUtxos
        .filter(u => u.isFrozen)
        .map(u => `${u.txid}:${u.vout}`),
    );

    const spentCount = localSyncedUtxos.filter(u => !freshSet.has(`${u.txid}:${u.vout}`)).length;
    const newCount = freshUtxos.filter(u => !localSet.has(`${u.txid}:${u.vout}`)).length;
    const refreshedUtxos = freshUtxos.map(utxo => ({
      ...utxo,
      isFrozen: frozenLocalSet.has(`${utxo.txid}:${utxo.vout}`) || utxo.isFrozen,
    }));

    // Replace: keep untouched UTXOs intact, refresh only the synced addresses' UTXOs.
    await this.utxoRepository.replaceAll(walletId, [...untouchedUtxos, ...refreshedUtxos]);

    return { newCount, spentCount };
  }
}
