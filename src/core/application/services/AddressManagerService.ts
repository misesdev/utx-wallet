import type { AddressOrigin } from '../../domain/entities/AddressOrigin';
import { DEFAULT_ORIGIN_NAME } from '../../domain/entities/AddressOrigin';
import type { WalletAddress } from '../../domain/entities/WalletAddress';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { AddressOriginRepository } from '../../domain/repositories/AddressOriginRepository';
import type { WalletAddressRepository } from '../../domain/repositories/WalletAddressRepository';
import { CreateAddressOriginUseCase } from '../../domain/usecases/address/CreateAddressOriginUseCase';
import { ListAddressOriginsUseCase } from '../../domain/usecases/address/ListAddressOriginsUseCase';
import { GetNextReceiveAddressUseCase } from '../../domain/usecases/address/GetNextReceiveAddressUseCase';
import { GetNextChangeAddressUseCase } from '../../domain/usecases/address/GetNextChangeAddressUseCase';
import { EnsureAddressPoolUseCase } from '../../domain/usecases/address/EnsureAddressPoolUseCase';
import { RenameAddressOriginUseCase } from '../../domain/usecases/address/RenameAddressOriginUseCase';
import type { WalletDiscoveryProgress } from '../../domain/usecases/wallet/WalletDiscoveryUseCase';
import { WalletDiscoveryUseCase } from '../../domain/usecases/wallet/WalletDiscoveryUseCase';
import type { ImportSyncProgress, ImportSyncResult } from '../../domain/usecases/wallet/WalletImportSyncUseCase';
import { WalletImportSyncUseCase } from '../../domain/usecases/wallet/WalletImportSyncUseCase';
import { AppError } from '../errors/AppError';

export class AddressManagerService {
  constructor(
    private readonly createOrigin: CreateAddressOriginUseCase,
    private readonly listOrigins: ListAddressOriginsUseCase,
    private readonly getNextReceiveAddress: GetNextReceiveAddressUseCase,
    private readonly getNextChangeAddress: GetNextChangeAddressUseCase,
    private readonly ensurePool: EnsureAddressPoolUseCase,
    private readonly originRepository: AddressOriginRepository,
    private readonly walletAddressRepository: WalletAddressRepository | null = null,
    private readonly renameOrigin: RenameAddressOriginUseCase | null = null,
    private readonly walletDiscovery: WalletDiscoveryUseCase | null = null,
    private readonly walletImportSync: WalletImportSyncUseCase | null = null,
  ) {}

  getOrigins(walletId: string): Promise<AddressOrigin[]> {
    return this.listOrigins.execute(walletId);
  }

  createAddressOrigin(walletId: string, name: string, network: BitcoinNetwork): Promise<AddressOrigin> {
    return this.createOrigin.execute(walletId, name, network);
  }

  renameAddressOrigin(originId: string, name: string): Promise<AddressOrigin> {
    if (this.renameOrigin) return this.renameOrigin.execute(originId, name);
    return this.renameFallback(originId, name);
  }

  private async renameFallback(originId: string, name: string): Promise<AddressOrigin> {
    const renamed = new RenameAddressOriginUseCase(
      this.originRepository,
      this.walletAddressRepository,
    );
    return renamed.execute(originId, name);
  }

  getReceiveAddress(
    walletId: string,
    network: BitcoinNetwork,
    originId?: string,
    reserve = false,
  ): Promise<WalletAddress> {
    return this.getNextReceiveAddress.execute(walletId, network, originId, reserve);
  }

  getChangeAddress(
    walletId: string,
    network: BitcoinNetwork,
    originId?: string,
    reserve = false,
  ): Promise<WalletAddress> {
    return this.getNextChangeAddress.execute(walletId, network, originId, reserve);
  }

  ensureAddressPool(walletId: string, network: BitcoinNetwork): Promise<void> {
    return this.ensurePool.execute(walletId, network);
  }

  listAddresses(walletId: string): Promise<WalletAddress[]> {
    if (!this.walletAddressRepository) return Promise.resolve([]);
    return this.walletAddressRepository.findByWallet(walletId);
  }

  /**
   * Creates the Default origin for the wallet if it doesn't exist yet.
   * Safe to call on every wallet creation/import and on every sync.
   */
  async ensureDefaultOrigin(walletId: string, network: BitcoinNetwork): Promise<AddressOrigin> {
    const existing = await this.originRepository.findDefault(walletId);
    if (existing) return existing;
    return this.createOrigin.execute(walletId, DEFAULT_ORIGIN_NAME, network);
  }

  discoverWalletAccounts(
    walletId: string,
    network: BitcoinNetwork,
    onProgress?: (progress: WalletDiscoveryProgress) => void,
  ): Promise<AddressOrigin[]> {
    if (!this.walletDiscovery) {
      return this.ensureDefaultOrigin(walletId, network).then(o => [o]);
    }
    return this.walletDiscovery.execute(walletId, network, onProgress);
  }

  importSync(
    walletId: string,
    network: BitcoinNetwork,
    onProgress?: (progress: ImportSyncProgress) => void,
  ): Promise<ImportSyncResult> {
    if (!this.walletImportSync) {
      throw new AppError('WalletImportSyncUseCase not available', 'IMPORT_SYNC_UNAVAILABLE');
    }
    return this.walletImportSync.execute(walletId, network, onProgress);
  }
}
