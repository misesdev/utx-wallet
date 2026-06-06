import type { Wallet } from '../../entities/Wallet';
import type { BitcoinNetwork } from '../../entities/Network';
import type { WalletRepository } from '../../repositories/WalletRepository';

export class ImportWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(name: string, secret: string, network?: BitcoinNetwork): Promise<Wallet> {
    return this.walletRepository.import(name, secret, network);
  }
}
