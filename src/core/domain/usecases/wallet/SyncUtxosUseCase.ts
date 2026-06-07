import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../entities/Network';
import type { Utxo } from '../../entities/Utxo';
import { delay } from '../../../../shared/utils/asyncUtils';

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

  async execute(walletId: string, addresses: string[], network: BitcoinNetwork): Promise<SyncUtxosResult> {
    const localUtxos = await this.utxoRepository.listByWallet(walletId);

    const freshUtxos: Utxo[] = [];
    for (let i = 0; i < addresses.length; i++) {
      const utxos = await this.blockchainProvider.getUtxos(addresses[i], network);
      freshUtxos.push(...utxos);
      if (i < addresses.length - 1) {
        await delay(this.requestDelayMs);
      }
    }

    const freshSet = new Set(freshUtxos.map(u => `${u.txid}:${u.vout}`));
    const localSet = new Set(localUtxos.map(u => `${u.txid}:${u.vout}`));

    const spentCount = localUtxos.filter(u => !freshSet.has(`${u.txid}:${u.vout}`)).length;
    const newCount = freshUtxos.filter(u => !localSet.has(`${u.txid}:${u.vout}`)).length;

    await this.utxoRepository.replaceAll(walletId, freshUtxos);

    return { newCount, spentCount };
  }
}
