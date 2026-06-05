import type { Wallet } from '../../entities/Wallet';
import type { WalletRepository } from '../../repositories/WalletRepository';

export class ImportWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(name: string, secret: string): Promise<Wallet> {
    return this.walletRepository.import(name, secret);
  }
}
