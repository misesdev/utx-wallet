import type { WalletRepository } from '../../repositories/WalletRepository';
import type { AddressRepository } from '../../repositories/AddressRepository';
import type { SyncStateRepository } from '../../repositories/SyncStateRepository';
import { AppError } from '../../../application/errors/AppError';
import { GenerateReceiveAddressUseCase } from './GenerateReceiveAddressUseCase';
import { SyncUtxosUseCase } from './SyncUtxosUseCase';
import { SyncTransactionsUseCase } from './SyncTransactionsUseCase';
import { SyncBalanceUseCase } from './SyncBalanceUseCase';

export type SyncResult = {
  newUtxos: number;
  spentUtxos: number;
  newTransactions: number;
  syncedAt: string;
};

export class SyncWalletUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly addressRepository: AddressRepository,
    private readonly generateReceiveAddress: GenerateReceiveAddressUseCase,
    private readonly syncUtxos: SyncUtxosUseCase,
    private readonly syncTransactions: SyncTransactionsUseCase,
    private readonly syncBalance: SyncBalanceUseCase,
    private readonly syncStateRepository: SyncStateRepository,
  ) {}

  async execute(walletId: string): Promise<SyncResult> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 'WALLET_NOT_FOUND');
    }

    // Ensure at least the first receive address (index 0) is generated and stored
    let storedAddresses = await this.addressRepository.findReceiveAddresses(walletId);
    if (storedAddresses.length === 0) {
      await this.generateReceiveAddress.execute(walletId);
      storedAddresses = await this.addressRepository.findReceiveAddresses(walletId);
    }

    const addressValues = storedAddresses.map(a => a.value);

    const [utxoResult, txResult] = await Promise.all([
      this.syncUtxos.execute(walletId, addressValues, wallet.network),
      this.syncTransactions.execute(walletId, addressValues, wallet.network),
    ]);

    await this.syncBalance.execute(walletId);

    const syncedAt = new Date().toISOString();
    await this.syncStateRepository.saveLastSyncAt(walletId, syncedAt);

    return {
      newUtxos: utxoResult.newCount,
      spentUtxos: utxoResult.spentCount,
      newTransactions: txResult.newCount,
      syncedAt,
    };
  }
}
