import type { Wallet } from '../../entities/Wallet';
import type { WalletRepository } from '../../repositories/WalletRepository';

export class CreateWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(name: string): Promise<Wallet> {
    return this.walletRepository.create(name);
  }
}
