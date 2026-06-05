import type { Wallet } from '../../entities/Wallet';
import type { WalletRepository } from '../../repositories/WalletRepository';

export class LoadWalletsUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(): Promise<Wallet[]> {
    return this.walletRepository.list();
  }
}
