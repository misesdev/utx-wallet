import type { WalletRepository } from '../../repositories/WalletRepository';
import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { TransactionRepository } from '../../repositories/TransactionRepository';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { AddressRepository } from '../../repositories/AddressRepository';
import type { SyncStateRepository } from '../../repositories/SyncStateRepository';

export class DeleteWalletUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly utxoRepository: UtxoRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly addressOriginRepository: AddressOriginRepository,
    private readonly addressRepository: AddressRepository,
    private readonly syncStateRepository: SyncStateRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await Promise.all([
      this.utxoRepository.deleteByWallet(id),
      this.transactionRepository.deleteByWallet(id),
      this.walletAddressRepository.deleteByWallet(id),
      this.addressOriginRepository.deleteByWallet(id),
      this.addressRepository.deleteByWallet(id),
      this.syncStateRepository.removeLastSyncAt(id),
    ]);
    await this.walletRepository.delete(id);
  }
}
