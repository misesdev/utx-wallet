import type { Wallet } from '../../domain/entities/Wallet';
import type { Transaction } from '../../domain/entities/Transaction';
import type { Utxo } from '../../domain/entities/Utxo';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { SyncResult } from '../../domain/usecases/wallet/SyncWalletUseCase';
import { AppError } from '../errors/AppError';
import { CreateWalletUseCase } from '../../domain/usecases/wallet/CreateWalletUseCase';
import { ImportWalletUseCase } from '../../domain/usecases/wallet/ImportWalletUseCase';
import { LoadWalletsUseCase } from '../../domain/usecases/wallet/LoadWalletsUseCase';
import { SelectWalletUseCase } from '../../domain/usecases/wallet/SelectWalletUseCase';
import { DeleteWalletUseCase } from '../../domain/usecases/wallet/DeleteWalletUseCase';
import { LoadTransactionsUseCase } from '../../domain/usecases/wallet/LoadTransactionsUseCase';
import { LoadUtxosUseCase } from '../../domain/usecases/wallet/LoadUtxosUseCase';
import { SyncWalletUseCase } from '../../domain/usecases/wallet/SyncWalletUseCase';
import { FreezeUtxoUseCase } from '../../domain/usecases/wallet/FreezeUtxoUseCase';
import { UnfreezeUtxoUseCase } from '../../domain/usecases/wallet/UnfreezeUtxoUseCase';

export class WalletService {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly importWalletUseCase: ImportWalletUseCase,
    private readonly loadWalletsUseCase: LoadWalletsUseCase,
    private readonly selectWalletUseCase: SelectWalletUseCase,
    private readonly deleteWalletUseCase: DeleteWalletUseCase,
    private readonly loadTransactionsUseCase: LoadTransactionsUseCase,
    private readonly loadUtxosUseCase: LoadUtxosUseCase,
    private readonly syncWalletUseCase: SyncWalletUseCase,
    private readonly freezeUtxoUseCase: FreezeUtxoUseCase,
    private readonly unfreezeUtxoUseCase: UnfreezeUtxoUseCase,
  ) {}

  createWallet(name: string): Promise<Wallet> {
    return this.createWalletUseCase.execute(name);
  }

  importWallet(name: string, secret: string, network?: BitcoinNetwork): Promise<Wallet> {
    return this.importWalletUseCase.execute(name, secret, network);
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

  listTransactions(walletId: string): Promise<Transaction[]> {
    return this.loadTransactionsUseCase.execute(walletId);
  }

  listUtxos(walletId: string): Promise<Utxo[]> {
    return this.loadUtxosUseCase.execute(walletId);
  }

  syncWallet(walletId: string): Promise<SyncResult> {
    return this.syncWalletUseCase.execute(walletId);
  }

  freezeUtxo(walletId: string, txid: string, vout: number): Promise<void> {
    return this.freezeUtxoUseCase.execute(walletId, txid, vout);
  }

  unfreezeUtxo(walletId: string, txid: string, vout: number): Promise<void> {
    return this.unfreezeUtxoUseCase.execute(walletId, txid, vout);
  }
}
