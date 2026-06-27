import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { OfflineTransaction } from '../../domain/entities/OfflineTransaction';
import type { BlockchainProvider } from '../../domain/repositories/BlockchainProvider';
import { BuildTransactionUseCase } from '../../domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../domain/usecases/transaction/SignTransactionUseCase';
import { SaveOfflineTransactionUseCase } from '../../domain/usecases/offline/SaveOfflineTransactionUseCase';
import { LoadOfflineTransactionsUseCase } from '../../domain/usecases/offline/LoadOfflineTransactionsUseCase';
import { DeleteOfflineTransactionUseCase } from '../../domain/usecases/offline/DeleteOfflineTransactionUseCase';
import { AppError } from '../errors/AppError';
import { generateId } from '../../../shared/utils/generateId';

export type PrepareOfflineTxParams = {
  walletId: string;
  walletNetwork: BitcoinNetwork;
  toAddress: string;
  amountSats: number;
  feeRateSatsPerVByte: number;
};

export type ImportRawHexOptions = {
  network?: BitcoinNetwork;
  toAddress?: string;
  amountSats?: number;
  feeSats?: number;
};

export class OfflineModeService {
  constructor(
    private readonly buildTransaction: BuildTransactionUseCase,
    private readonly signTransaction: SignTransactionUseCase,
    private readonly saveOfflineTx: SaveOfflineTransactionUseCase,
    private readonly loadOfflineTxs: LoadOfflineTransactionsUseCase,
    private readonly deleteOfflineTx: DeleteOfflineTransactionUseCase,
    private readonly blockchainProvider: BlockchainProvider,
  ) {}

  async prepareTransaction(params: PrepareOfflineTxParams): Promise<OfflineTransaction> {
    const built = await this.buildTransaction.execute(params);
    const signed = await this.signTransaction.execute({
      builtTransaction: built,
      walletId: params.walletId,
      network: params.walletNetwork,
    });
    const offlineTx: OfflineTransaction = {
      id: generateId(),
      walletId: params.walletId,
      network: params.walletNetwork,
      rawHex: signed.rawHex,
      txid: signed.txid,
      amountSats: built.amountSats,
      feeSats: built.feeSats,
      toAddress: params.toAddress,
      createdAt: new Date().toISOString(),
    };
    await this.saveOfflineTx.execute(offlineTx);
    return offlineTx;
  }

  async importRawHex(
    walletId: string,
    rawHex: string,
    opts?: ImportRawHexOptions,
  ): Promise<OfflineTransaction> {
    const cleaned = rawHex.trim();
    if (cleaned.length === 0 || !/^[0-9a-fA-F]+$/.test(cleaned)) {
      throw new AppError('Hex inválido', 'INVALID_HEX');
    }
    const offlineTx: OfflineTransaction = {
      id: generateId(),
      walletId,
      network: opts?.network,
      rawHex: cleaned,
      toAddress: opts?.toAddress,
      amountSats: opts?.amountSats,
      feeSats: opts?.feeSats,
      createdAt: new Date().toISOString(),
    };
    await this.saveOfflineTx.execute(offlineTx);
    return offlineTx;
  }

  listTransactions(walletId: string): Promise<OfflineTransaction[]> {
    return this.loadOfflineTxs.execute(walletId);
  }

  deleteTransaction(id: string): Promise<void> {
    return this.deleteOfflineTx.execute(id);
  }

  async broadcastTransaction(offlineTx: OfflineTransaction): Promise<string> {
    if (!offlineTx.network) {
      throw new AppError('Rede não identificada para esta transação offline', 'MISSING_NETWORK');
    }
    const txid = await this.blockchainProvider.broadcastTransaction(offlineTx.rawHex, offlineTx.network);
    await this.deleteOfflineTx.execute(offlineTx.id);
    return txid;
  }
}
