import type { WalletRepository } from '../../repositories/WalletRepository';

export class DeleteWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(id: string): Promise<void> {
    return this.walletRepository.delete(id);
  }
}
