import type { WalletRepository } from '../../repositories/WalletRepository';

export class GetWalletSeedUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  execute(walletId: string): Promise<{ mnemonic: string; passphrase?: string } | null> {
    return this.walletRepository.retrieveSeed(walletId);
  }
}
