import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../entities/Network';

export type SyncUtxosResult = {
  newCount: number;
  spentCount: number;
};

export class SyncUtxosUseCase {
  constructor(
    private readonly utxoRepository: UtxoRepository,
    private readonly blockchainProvider: BlockchainProvider,
  ) {}

  async execute(walletId: string, addresses: string[], network: BitcoinNetwork): Promise<SyncUtxosResult> {
    const [localUtxos, ...freshUtxoLists] = await Promise.all([
      this.utxoRepository.listByWallet(walletId),
      ...addresses.map(addr => this.blockchainProvider.getUtxos(addr, network)),
    ]);

    const freshUtxos = freshUtxoLists.flat();

    const freshSet = new Set(freshUtxos.map(u => `${u.txid}:${u.vout}`));
    const localSet = new Set(localUtxos.map(u => `${u.txid}:${u.vout}`));

    const spentCount = localUtxos.filter(u => !freshSet.has(`${u.txid}:${u.vout}`)).length;
    const newCount = freshUtxos.filter(u => !localSet.has(`${u.txid}:${u.vout}`)).length;

    await this.utxoRepository.replaceAll(walletId, freshUtxos);

    return { newCount, spentCount };
  }
}
