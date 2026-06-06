import type { Utxo } from '../../entities/Utxo';
import type { UtxoRepository } from '../../repositories/UtxoRepository';

export class LoadUtxosUseCase {
  constructor(private readonly utxoRepository: UtxoRepository) {}

  execute(walletId: string): Promise<Utxo[]> {
    return this.utxoRepository.listByWallet(walletId);
  }
}
