import type { WalletRepository } from '../../repositories/WalletRepository';
import type { AddressRepository } from '../../repositories/AddressRepository';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { SyncStateRepository } from '../../repositories/SyncStateRepository';
import { AppError } from '../../../application/errors/AppError';
import { GenerateReceiveAddressUseCase } from './GenerateReceiveAddressUseCase';
import { SyncUtxosUseCase } from './SyncUtxosUseCase';
import { SyncTransactionsUseCase } from './SyncTransactionsUseCase';
import { SyncBalanceUseCase } from './SyncBalanceUseCase';
import type { SyncAddressStatusUseCase } from '../address/SyncAddressStatusUseCase';
import type { AddressManagerService } from '../../../application/services/AddressManagerService';

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
    private readonly walletAddressRepository: WalletAddressRepository | null = null,
    private readonly syncAddressStatus: SyncAddressStatusUseCase | null = null,
    private readonly addressManager: AddressManagerService | null = null,
  ) {}

  async execute(walletId: string): Promise<SyncResult> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 'WALLET_NOT_FOUND');
    }

    // Bootstrap: ensure the Default HD origin exists so receive/change addresses are tracked.
    // Idempotent — skips silently if the origin is already created.
    if (this.addressManager) {
      await this.addressManager.ensureDefaultOrigin(walletId, wallet.network);
    }

    // Legacy receive address (backward compat with existing wallets)
    let storedAddresses = await this.addressRepository.findReceiveAddresses(walletId);
    if (storedAddresses.length === 0) {
      await this.generateReceiveAddress.execute(walletId);
      storedAddresses = await this.addressRepository.findReceiveAddresses(walletId);
    }

    // HD addresses cover ALL receive + change chains across all origins.
    // Without this, change UTXOs land at untracked addresses and appear to vanish.
    const hdAddresses = this.walletAddressRepository
      ? (await this.walletAddressRepository.findByWallet(walletId)).map(a => a.address)
      : [];

    const legacyAddresses = storedAddresses.map(a => a.value);
    const allAddresses = [...new Set([...legacyAddresses, ...hdAddresses])];

    const [utxoResult, txResult] = await Promise.all([
      this.syncUtxos.execute(walletId, allAddresses, wallet.network),
      this.syncTransactions.execute(walletId, allAddresses, wallet.network),
    ]);

    await this.syncBalance.execute(walletId);

    // Sync HD address statuses after UTXO/tx data is refreshed
    if (this.syncAddressStatus) {
      await this.syncAddressStatus.execute(walletId, wallet.network);
    }

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
