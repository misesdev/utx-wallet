import type { UtxoRepository } from '../../repositories/UtxoRepository';

export class FreezeUtxoUseCase {
  constructor(private readonly utxoRepository: UtxoRepository) {}

  execute(walletId: string, txid: string, vout: number): Promise<void> {
    return this.utxoRepository.freeze(walletId, txid, vout);
  }
}
