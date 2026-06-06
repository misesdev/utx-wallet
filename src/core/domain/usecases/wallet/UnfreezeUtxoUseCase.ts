import type { UtxoRepository } from '../../repositories/UtxoRepository';

export class UnfreezeUtxoUseCase {
  constructor(private readonly utxoRepository: UtxoRepository) {}

  execute(walletId: string, txid: string, vout: number): Promise<void> {
    return this.utxoRepository.unfreeze(walletId, txid, vout);
  }
}
