import { DEFAULT_ORIGIN_NAME } from '../../entities/AddressOrigin';
import type { AddressOrigin } from '../../entities/AddressOrigin';
import type { BitcoinNetwork } from '../../entities/Network';
import type { WalletAddressProvider } from '../../repositories/WalletAddressProvider';
import type { AddressActivityChecker } from '../../repositories/AddressActivityChecker';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { WalletRepository } from '../../repositories/WalletRepository';
import { CreateAddressOriginUseCase } from '../address/CreateAddressOriginUseCase';
import { AppError } from '../../../application/errors/AppError';

const XPUB_RE = /^(xpub|tpub|zpub|vpub)[a-zA-Z0-9]+$/;

export type WalletDiscoveryProgress = {
  phase: 'discovering';
  accountIndex: number;
  addressIndex: number;
  txFound: boolean;
};

const RECEIVE_GAP_LIMIT = 3;
const MAX_ADDRESSES_PER_ACCOUNT = 200;

export class WalletDiscoveryUseCase {
  constructor(
    private readonly addressProvider: WalletAddressProvider,
    private readonly activityChecker: AddressActivityChecker,
    private readonly createOriginUseCase: CreateAddressOriginUseCase,
    private readonly originRepository: AddressOriginRepository,
    private readonly walletRepository: WalletRepository | null = null,
  ) {}

  async execute(
    walletId: string,
    network: BitcoinNetwork,
    onProgress?: (progress: WalletDiscoveryProgress) => void,
  ): Promise<AddressOrigin[]> {
    const discoveredOrigins: AddressOrigin[] = [];
    let accountIndex = 0;

    // Watch-only wallets hold a zpub/vpub already fixed to one account — never discover more.
    const isWatchOnly = await this.resolveIsWatchOnly(walletId);

    while (true) {
      const isActive = await this.isAccountActive(walletId, network, accountIndex, onProgress);

      if (accountIndex === 0) {
        const origin = await this.getOrCreateOrigin(walletId, DEFAULT_ORIGIN_NAME, network);
        discoveredOrigins.push(origin);
        if (!isActive || isWatchOnly) break;
      } else {
        if (!isActive) break;
        const origin = await this.getOrCreateOrigin(walletId, `Account ${accountIndex}`, network);
        discoveredOrigins.push(origin);
      }

      accountIndex++;
    }

    return discoveredOrigins;
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
        const origins = await this.originRepository.findByWallet(walletId);
        const existing = origins.find(o => o.name === name && !o.archivedAt);
        if (existing) return existing;
      }
      throw err;
    }
  }

  private async resolveIsWatchOnly(walletId: string): Promise<boolean> {
    if (!this.walletRepository) return false;
    const key = await this.walletRepository.retrieveRawKey(walletId);
    return key ? XPUB_RE.test(key.secret) : false;
  }

  private async isAccountActive(
    walletId: string,
    network: BitcoinNetwork,
    accountIndex: number,
    onProgress?: (progress: WalletDiscoveryProgress) => void,
  ): Promise<boolean> {
    let consecutiveFresh = 0;
    let totalTxCount = 0;
    let addressIndex = 0;

    while (consecutiveFresh < RECEIVE_GAP_LIMIT && addressIndex < MAX_ADDRESSES_PER_ACCOUNT) {
      const address = await this.addressProvider.getReceiveAddress(
        walletId,
        network,
        addressIndex,
        accountIndex,
      );

      onProgress?.({ phase: 'discovering', accountIndex, addressIndex, txFound: false });

      try {
        const txCount = await this.activityChecker.getAddressTxCount(address, network);
        if (txCount > 0) {
          totalTxCount += txCount;
          consecutiveFresh = 0;
          onProgress?.({ phase: 'discovering', accountIndex, addressIndex, txFound: true });
        } else {
          consecutiveFresh++;
        }
      } catch {
        consecutiveFresh++;
      }

      addressIndex++;
    }

    return totalTxCount > 0;
  }
}
