import type { Wallet } from '../../entities/Wallet';
import type { WalletRepository } from '../../repositories/WalletRepository';

export class RenameWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(id: string, name: string): Promise<Wallet> {
    return this.walletRepository.rename(id, name);
  }
}
