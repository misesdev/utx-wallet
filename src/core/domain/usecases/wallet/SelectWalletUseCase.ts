import type { Wallet } from '../../entities/Wallet';
import type { WalletRepository } from '../../repositories/WalletRepository';

export class SelectWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(id: string): Promise<Wallet | null> {
    return this.walletRepository.findById(id);
  }
}
