import type { WalletRepository } from '../../repositories/WalletRepository';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { SyncStateRepository } from '../../repositories/SyncStateRepository';
import { AppError } from '../../../application/errors/AppError';
import type { SyncAccountUseCase } from './SyncAccountUseCase';
import type { AddressManagerService } from '../../../application/services/AddressManagerService';
import type { OnSyncProgress } from './SyncProgress';

export type SyncResult = {
  newUtxos: number;
  spentUtxos: number;
  newTransactions: number;
  syncedAt: string;
};

export class SyncWalletUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly originRepository: AddressOriginRepository,
    private readonly syncAccount: SyncAccountUseCase,
    private readonly syncStateRepository: SyncStateRepository,
    private readonly addressManager: AddressManagerService | null = null,
  ) {}

  async execute(walletId: string, onProgress?: OnSyncProgress): Promise<SyncResult> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 'WALLET_NOT_FOUND');
    }

    if (this.addressManager) {
      await this.addressManager.ensureDefaultOrigin(walletId, wallet.network);
    }

    const origins = (await this.originRepository.findByWallet(walletId)).filter(
      o => !o.archivedAt,
    );

    let totalNewUtxos = 0;
    let totalSpentUtxos = 0;
    let totalNewTransactions = 0;

    for (const origin of origins) {
      const wrappedProgress: OnSyncProgress | undefined = onProgress
        ? (p) => onProgress({ ...p, accountName: origin.name })
        : undefined;
      const result = await this.syncAccount.execute(walletId, origin.id, wrappedProgress);
      totalNewUtxos += result.newUtxos;
      totalSpentUtxos += result.spentUtxos;
      totalNewTransactions += result.newTransactions;
    }

    const syncedAt = new Date().toISOString();
    await this.syncStateRepository.saveLastSyncAt(walletId, syncedAt);

    return {
      newUtxos: totalNewUtxos,
      spentUtxos: totalSpentUtxos,
      newTransactions: totalNewTransactions,
      syncedAt,
    };
  }
}
