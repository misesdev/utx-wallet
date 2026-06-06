import type { UtxoRepository } from '../../repositories/UtxoRepository';

export type BalanceSyncResult = {
  confirmedSats: number;
  pendingSats: number;
};

export class SyncBalanceUseCase {
  constructor(private readonly utxoRepository: UtxoRepository) {}

  async execute(walletId: string): Promise<BalanceSyncResult> {
    const utxos = await this.utxoRepository.listByWallet(walletId);
    return {
      confirmedSats: utxos.filter(u => u.isConfirmed).reduce((sum, u) => sum + u.valueSats, 0),
      pendingSats: utxos.filter(u => !u.isConfirmed).reduce((sum, u) => sum + u.valueSats, 0),
    };
  }
}
