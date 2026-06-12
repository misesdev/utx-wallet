import type { Wallet } from '../../domain/entities/Wallet';
import type { Transaction } from '../../domain/entities/Transaction';
import type { Utxo } from '../../domain/entities/Utxo';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { SyncResult } from '../../domain/usecases/wallet/SyncWalletUseCase';
import type { SyncAccountResult } from '../../domain/usecases/wallet/SyncAccountUseCase';
import type { SyncAddressResult } from '../../domain/usecases/wallet/SyncAddressUseCase';
import type { OnSyncProgress } from '../../domain/usecases/wallet/SyncProgress';
import { AppError } from '../errors/AppError';
import { CreateWalletUseCase } from '../../domain/usecases/wallet/CreateWalletUseCase';
import { ImportWalletUseCase } from '../../domain/usecases/wallet/ImportWalletUseCase';
import { LoadWalletsUseCase } from '../../domain/usecases/wallet/LoadWalletsUseCase';
import { SelectWalletUseCase } from '../../domain/usecases/wallet/SelectWalletUseCase';
import { DeleteWalletUseCase } from '../../domain/usecases/wallet/DeleteWalletUseCase';
import { RenameWalletUseCase } from '../../domain/usecases/wallet/RenameWalletUseCase';
import { GetWalletSeedUseCase } from '../../domain/usecases/wallet/GetWalletSeedUseCase';
import { LoadTransactionsUseCase } from '../../domain/usecases/wallet/LoadTransactionsUseCase';
import { LoadUtxosUseCase } from '../../domain/usecases/wallet/LoadUtxosUseCase';
import { SyncWalletUseCase } from '../../domain/usecases/wallet/SyncWalletUseCase';
import { SyncAccountUseCase } from '../../domain/usecases/wallet/SyncAccountUseCase';
import { SyncAddressUseCase } from '../../domain/usecases/wallet/SyncAddressUseCase';
import { FreezeUtxoUseCase } from '../../domain/usecases/wallet/FreezeUtxoUseCase';
import { UnfreezeUtxoUseCase } from '../../domain/usecases/wallet/UnfreezeUtxoUseCase';
import {
  ExportWalletKeyUseCase,
  type ExportWalletKeyParams,
  type ExportWalletKeyResult,
  type WalletExportFormat,
} from '../../domain/usecases/wallet/ExportWalletKeyUseCase';
import type { AddressManagerService } from './AddressManagerService';

export class WalletService {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly importWalletUseCase: ImportWalletUseCase,
    private readonly loadWalletsUseCase: LoadWalletsUseCase,
    private readonly selectWalletUseCase: SelectWalletUseCase,
    private readonly deleteWalletUseCase: DeleteWalletUseCase,
    private readonly renameWalletUseCase: RenameWalletUseCase,
    private readonly getWalletSeedUseCase: GetWalletSeedUseCase,
    private readonly loadTransactionsUseCase: LoadTransactionsUseCase,
    private readonly loadUtxosUseCase: LoadUtxosUseCase,
    private readonly syncWalletUseCase: SyncWalletUseCase,
    private readonly freezeUtxoUseCase: FreezeUtxoUseCase,
    private readonly unfreezeUtxoUseCase: UnfreezeUtxoUseCase,
    private readonly addressManagerService: AddressManagerService | null = null,
    private readonly exportWalletKeyUseCase: ExportWalletKeyUseCase | null = null,
    private readonly syncAccountUseCase: SyncAccountUseCase | null = null,
    private readonly syncAddressUseCase: SyncAddressUseCase | null = null,
  ) {}

  createWallet(name: string): Promise<Wallet> {
    return this.createWalletUseCase.execute(name);
  }

  importWallet(name: string, secret: string, network?: BitcoinNetwork, passphrase?: string): Promise<Wallet> {
    return this.importWalletUseCase.execute(name, secret, network, passphrase);
  }

  loadWallets(): Promise<Wallet[]> {
    return this.loadWalletsUseCase.execute();
  }

  async selectWallet(id: string): Promise<Wallet> {
    const wallet = await this.selectWalletUseCase.execute(id);
    if (!wallet) {
      throw new AppError(`Wallet not found: "${id}"`, 'WALLET_NOT_FOUND');
    }
    return wallet;
  }

  deleteWallet(id: string): Promise<void> {
    return this.deleteWalletUseCase.execute(id);
  }

  renameWallet(id: string, name: string): Promise<Wallet> {
    return this.renameWalletUseCase.execute(id, name);
  }

  getWalletSeed(walletId: string): Promise<{ mnemonic: string; passphrase?: string } | null> {
    return this.getWalletSeedUseCase.execute(walletId);
  }

  listTransactions(walletId: string): Promise<Transaction[]> {
    return this.loadTransactionsUseCase.execute(walletId);
  }

  listUtxos(walletId: string): Promise<Utxo[]> {
    return this.loadUtxosUseCase.execute(walletId);
  }

  syncWallet(walletId: string, onProgress?: OnSyncProgress): Promise<SyncResult> {
    return this.syncWalletUseCase.execute(walletId, onProgress);
  }

  freezeUtxo(walletId: string, txid: string, vout: number): Promise<void> {
    return this.freezeUtxoUseCase.execute(walletId, txid, vout);
  }

  unfreezeUtxo(walletId: string, txid: string, vout: number): Promise<void> {
    return this.unfreezeUtxoUseCase.execute(walletId, txid, vout);
  }

  exportWalletKey(params: ExportWalletKeyParams): Promise<ExportWalletKeyResult> {
    if (!this.exportWalletKeyUseCase) {
      throw new Error('ExportWalletKeyUseCase not configured');
    }
    return this.exportWalletKeyUseCase.execute(params);
  }

  getExportFormats(walletId: string): Promise<WalletExportFormat[]> {
    if (!this.exportWalletKeyUseCase) return Promise.resolve([]);
    return this.exportWalletKeyUseCase.getAvailableFormats(walletId);
  }

  syncAccount(walletId: string, originId: string, onProgress?: OnSyncProgress): Promise<SyncAccountResult> {
    if (!this.syncAccountUseCase) {
      throw new AppError('SyncAccountUseCase not configured', 'NOT_CONFIGURED');
    }
    return this.syncAccountUseCase.execute(walletId, originId, onProgress);
  }

  syncAddress(walletId: string, address: string, onProgress?: OnSyncProgress): Promise<SyncAddressResult> {
    if (!this.syncAddressUseCase) {
      throw new AppError('SyncAddressUseCase not configured', 'NOT_CONFIGURED');
    }
    return this.syncAddressUseCase.execute(walletId, address, onProgress);
  }
}
