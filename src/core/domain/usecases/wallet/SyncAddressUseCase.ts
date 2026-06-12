import type { WalletRepository } from '../../repositories/WalletRepository';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import { AppError } from '../../../application/errors/AppError';
import { SyncUtxosUseCase } from './SyncUtxosUseCase';
import { SyncTransactionsUseCase } from './SyncTransactionsUseCase';
import { SyncBalanceUseCase } from './SyncBalanceUseCase';
import type { SyncAddressStatusUseCase } from '../address/SyncAddressStatusUseCase';
import type { OnSyncProgress } from './SyncProgress';

const NON_SYNCABLE_STATUSES = new Set(['spent_once', 'change', 'archived']);

export type SyncAddressResult = {
  newUtxos: number;
  spentUtxos: number;
  newTransactions: number;
  syncedAt: string;
};

export class SyncAddressUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly syncUtxos: SyncUtxosUseCase,
    private readonly syncTransactions: SyncTransactionsUseCase,
    private readonly syncBalance: SyncBalanceUseCase,
    private readonly syncAddressStatus: SyncAddressStatusUseCase | null = null,
  ) {}

  async execute(walletId: string, address: string, onProgress?: OnSyncProgress): Promise<SyncAddressResult> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 'WALLET_NOT_FOUND');
    }

    const walletAddress = await this.walletAddressRepository.findByAddress(address);
    if (!walletAddress) {
      throw new AppError('Address not found', 'ADDRESS_NOT_FOUND');
    }

    if (walletAddress.walletId !== walletId) {
      throw new AppError('Address does not belong to wallet', 'ADDRESS_NOT_IN_WALLET');
    }

    if (NON_SYNCABLE_STATUSES.has(walletAddress.status)) {
      throw new AppError('Address status cannot be synced', 'ADDRESS_NOT_SYNCABLE');
    }

    const addressMetadata = new Map([[address, {
      originId: walletAddress.originId,
      originName: walletAddress.originName,
    }]]);

    const utxoProgress: OnSyncProgress = p => onProgress?.({ ...p, phase: 'utxos' });
    const txProgress: OnSyncProgress = p => onProgress?.({ ...p, phase: 'transactions' });

    const utxoResult = await this.syncUtxos.execute(walletId, [address], wallet.network, utxoProgress);
    const txResult = await this.syncTransactions.execute(walletId, [address], wallet.network, addressMetadata, txProgress);
    await this.syncBalance.execute(walletId);

    if (this.syncAddressStatus) {
      await this.syncAddressStatus.execute(walletId, wallet.network, txResult.fetchedTransactions);
    }

    return {
      newUtxos: utxoResult.newCount,
      spentUtxos: utxoResult.spentCount,
      newTransactions: txResult.newCount,
      syncedAt: new Date().toISOString(),
    };
  }
}
