import type { WalletRepository } from '../../repositories/WalletRepository';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { SyncStateRepository } from '../../repositories/SyncStateRepository';
import type { SyncSettingsRepository } from '../../repositories/SyncSettingsRepository';
import type { NodeRepository } from '../../repositories/NodeRepository';
import type { BitcoinNetwork } from '../../entities/Network';
import { AppError } from '../../../application/errors/AppError';
import { normalizeTestnet } from '../../../../shared/constants/networks';
import { SyncUtxosUseCase } from './SyncUtxosUseCase';
import { SyncTransactionsUseCase } from './SyncTransactionsUseCase';
import { SyncBalanceUseCase } from './SyncBalanceUseCase';
import type { SyncAddressStatusUseCase } from '../address/SyncAddressStatusUseCase';
import type { OnSyncProgress, SyncProgress } from './SyncProgress';
import { DEFAULT_SYNC_SETTINGS } from '../../entities/SyncSettings';

export type SyncAccountResult = {
  newUtxos: number;
  spentUtxos: number;
  newTransactions: number;
  syncedAt: string;
  hasActivity: boolean;
};

const MAX_DISCOVER_ITERATIONS = 20;

export class SyncAccountUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly syncUtxos: SyncUtxosUseCase,
    private readonly syncTransactions: SyncTransactionsUseCase,
    private readonly syncBalance: SyncBalanceUseCase,
    private readonly syncStateRepository: SyncStateRepository,
    private readonly syncAddressStatus: SyncAddressStatusUseCase | null = null,
    private readonly syncSettingsRepository: SyncSettingsRepository | null = null,
    private readonly nodeRepository: NodeRepository | null = null,
  ) {}

  async execute(walletId: string, originId: string, onProgress?: OnSyncProgress): Promise<SyncAccountResult> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 'WALLET_NOT_FOUND');
    }

    let syncOpts: { parallel: boolean; requestDelayMs?: number } = { parallel: false };
    if (this.syncSettingsRepository) {
      const syncSettings = (await this.syncSettingsRepository.load()) ?? DEFAULT_SYNC_SETTINGS;
      // Parallel sync is only safe when the wallet's network is backed by a personal node.
      // Firing concurrent requests at the public Mempool API causes HTTP 429 rate limiting.
      const parallelAllowed =
        syncSettings.parallelSync &&
        (await this.hasPersonalNodeForNetwork(wallet.network as BitcoinNetwork));
      syncOpts = {
        parallel: parallelAllowed,
        requestDelayMs: Math.floor(1000 / syncSettings.maxRequestsPerSecond),
      };
    }

    const syncedThisRun = new Set<string>();
    let totalNewUtxos = 0;
    let totalSpentUtxos = 0;
    let totalNewTransactions = 0;
    let hasActivity = false;

    for (let iteration = 0; iteration < MAX_DISCOVER_ITERATIONS; iteration++) {
      const [receivePool, changePool] = await Promise.all([
        this.walletAddressRepository.findFreshByChain(walletId, originId, 'receive', ['received']),
        this.walletAddressRepository.findFreshByChain(walletId, originId, 'change', ['reserved']),
      ]);

      const poolAddresses = [...receivePool, ...changePool].filter(
        a => !syncedThisRun.has(a.address),
      );

      if (poolAddresses.length === 0) break;

      const addresses = poolAddresses.map(a => a.address);
      const addressMetadata = new Map(
        poolAddresses.map(a => [a.address, { originId: a.originId, originName: a.originName }]),
      );

      const utxoProgress: OnSyncProgress | undefined = onProgress
        ? (p: SyncProgress) => onProgress({ ...p, phase: 'utxos' })
        : undefined;
      const txProgress: OnSyncProgress | undefined = onProgress
        ? (p: SyncProgress) => onProgress({ ...p, phase: 'transactions' })
        : undefined;

      const utxoResult = await this.syncUtxos.execute(walletId, addresses, wallet.network, utxoProgress, syncOpts);
      const txResult = await this.syncTransactions.execute(walletId, addresses, wallet.network, addressMetadata, txProgress, syncOpts);

      for (const txs of txResult.fetchedTransactions.values()) {
        if (txs.length > 0) {
          hasActivity = true;
          break;
        }
      }

      for (const addr of addresses) syncedThisRun.add(addr);

      totalNewUtxos += utxoResult.newCount;
      totalSpentUtxos += utxoResult.spentCount;
      totalNewTransactions += txResult.newCount;

      await this.syncBalance.execute(walletId);

      if (this.syncAddressStatus) {
        await this.syncAddressStatus.execute(walletId, wallet.network, txResult.fetchedTransactions);
      }
    }

    const syncedAt = new Date().toISOString();
    await this.syncStateRepository.saveLastSyncAt(walletId, syncedAt);

    return {
      newUtxos: totalNewUtxos,
      spentUtxos: totalSpentUtxos,
      newTransactions: totalNewTransactions,
      syncedAt,
      hasActivity,
    };
  }

  private async hasPersonalNodeForNetwork(network: BitcoinNetwork): Promise<boolean> {
    if (!this.nodeRepository) return false;
    const config = await this.nodeRepository.getNetworkConfig();
    if (config.nodeMode !== 'personal-node') return false;
    return (config.personalNodes ?? []).some(
      n => normalizeTestnet(n.network) === normalizeTestnet(network),
    );
  }
}
