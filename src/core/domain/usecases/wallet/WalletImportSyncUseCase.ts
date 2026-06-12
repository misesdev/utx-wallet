import { DEFAULT_ORIGIN_NAME } from '../../entities/AddressOrigin';
import type { AddressOrigin } from '../../entities/AddressOrigin';
import type { BitcoinNetwork } from '../../entities/Network';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { WalletRepository } from '../../repositories/WalletRepository';
import type { CreateAddressOriginUseCase } from '../address/CreateAddressOriginUseCase';
import type { SyncAccountUseCase } from './SyncAccountUseCase';
import type { OnSyncProgress } from './SyncProgress';
import { AppError } from '../../../application/errors/AppError';

export type ImportSyncProgress = {
  phase: 'discovering' | 'syncing';
  accountIndex: number;
  addressIndex: number;
  txFound: boolean;
};

export type ImportSyncResult = {
  origins: AddressOrigin[];
  newTransactions: number;
  newUtxos: number;
};

const XPUB_RE = /^(xpub|tpub|zpub|vpub)[a-zA-Z0-9]+$/;
const MAX_ACCOUNTS = 20;

export class WalletImportSyncUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly originRepository: AddressOriginRepository,
    private readonly createOriginUseCase: CreateAddressOriginUseCase,
    private readonly syncAccount: SyncAccountUseCase,
  ) {}

  async execute(
    walletId: string,
    network: BitcoinNetwork,
    onProgress?: (progress: ImportSyncProgress) => void,
  ): Promise<ImportSyncResult> {
    const isWatchOnly = await this.resolveIsWatchOnly(walletId);
    const maxAccounts = isWatchOnly ? 1 : MAX_ACCOUNTS;
    const origins: AddressOrigin[] = [];
    let totalNewUtxos = 0;
    let totalNewTransactions = 0;
    let previousHadActivity = true; // account 0 is always probed

    for (let accountIndex = 0; accountIndex < maxAccounts; accountIndex++) {
      // Stop discovery when the previous account had no activity (BIP44 sequential rule).
      // Account 0 is always created regardless.
      if (accountIndex > 0 && !previousHadActivity) break;

      const originName = accountIndex === 0 ? DEFAULT_ORIGIN_NAME : `Account ${accountIndex}`;
      const origin = await this.getOrCreateOrigin(walletId, originName, network);

      const adaptedProgress: OnSyncProgress | undefined = onProgress
        ? (p) => onProgress({
            phase: 'discovering',
            accountIndex,
            addressIndex: p.currentIndex,
            txFound: false,
          })
        : undefined;

      const result = await this.syncAccount.execute(walletId, origin.id, adaptedProgress);

      // An account with no activity is only the break signal (BIP44 gap limit).
      // Archive it from the DB so it doesn't appear as a wallet account, and stop discovery.
      if (!result.hasActivity && accountIndex > 0) {
        await this.originRepository.archive(origin.id);
        break;
      }

      origins.push(origin);
      totalNewUtxos += result.newUtxos;
      totalNewTransactions += result.newTransactions;

      if (result.hasActivity) {
        onProgress?.({ phase: 'syncing', accountIndex, addressIndex: 0, txFound: true });
      }

      previousHadActivity = result.hasActivity;
    }

    return { origins, newTransactions: totalNewTransactions, newUtxos: totalNewUtxos };
  }

  private async getOrCreateOrigin(
    walletId: string,
    name: string,
    network: BitcoinNetwork,
  ): Promise<AddressOrigin> {
    try {
      return await this.createOriginUseCase.execute(walletId, name, network);
    } catch (err) {
      if (err instanceof AppError && err.code === 'ORIGIN_EXISTS') {
        const all = await this.originRepository.findByWallet(walletId);
        const found = all.find(o => o.name === name && !o.archivedAt);
        if (found) return found;
      }
      throw err;
    }
  }

  private async resolveIsWatchOnly(walletId: string): Promise<boolean> {
    const key = await this.walletRepository.retrieveRawKey(walletId);
    return key ? XPUB_RE.test(key.secret) : false;
  }
}
