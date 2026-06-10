import { DEFAULT_ORIGIN_NAME } from '../../entities/AddressOrigin';
import type { AddressOrigin } from '../../entities/AddressOrigin';
import type { BitcoinNetwork } from '../../entities/Network';
import type { Transaction } from '../../entities/Transaction';
import type { Utxo } from '../../entities/Utxo';
import type { WalletAddress } from '../../entities/WalletAddress';
import { ADDRESS_POLICY } from '../../entities/WalletAddress';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { TransactionRepository } from '../../repositories/TransactionRepository';
import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { WalletAddressProvider } from '../../repositories/WalletAddressProvider';
import type { CreateAddressOriginUseCase } from '../address/CreateAddressOriginUseCase';
import type { SyncAddressStatusUseCase } from '../address/SyncAddressStatusUseCase';
import type { SyncBalanceUseCase } from './SyncBalanceUseCase';
import { AppError } from '../../../application/errors/AppError';
import { derivationPathForAddress } from '../../services/AddressDerivationService';
import { generateId } from '../../../../shared/utils/generateId';

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

const { minAvailableReceive, minAvailableChange } = ADDRESS_POLICY;
const MAX_ACCOUNTS = 20;

type ScannedAddress = {
  address: string;
  chain: 'receive' | 'change';
  index: number;
  hasTxs: boolean;
};

type AccountScanResult = {
  scannedReceive: ScannedAddress[];
  scannedChange: ScannedAddress[];
  txsByAddress: Map<string, Transaction[]>;
  hasActivity: boolean;
};

/**
 * Full wallet import sync combining BIP44 account discovery, adaptive batch
 * address scanning, transaction persistence, and smart UTXO sync.
 *
 * Scanning uses a pool-policy stopping condition: each chain stops as soon as
 * the TOTAL count of fresh (no-transaction) addresses across the scanned range
 * reaches `poolSize` (3). This is more efficient than trailing-consecutive logic
 * because non-sequential fresh addresses (e.g. indices 1, 2, 4 when index 3 is
 * used) each contribute to the total, avoiding unnecessary extra batches.
 *
 * Example: receive chain [addr0=used, addr1=fresh, addr2=fresh, addr3=fresh]
 *   batch(0-2): totalFresh=2 → toGenerate=1 → batch(3): totalFresh=3 → STOP (4 calls)
 *   (tailFresh approach would scan 2 more: addr4, addr5)
 *
 * Receive and change chains are scanned in parallel; addresses within each batch
 * are also queried in parallel, keeping import time proportional to actual wallet
 * depth rather than to a worst-case constant.
 */
export class WalletImportSyncUseCase {
  constructor(
    private readonly addressProvider: WalletAddressProvider,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly transactionRepository: TransactionRepository,
    private readonly utxoRepository: UtxoRepository,
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly originRepository: AddressOriginRepository,
    private readonly createOriginUseCase: CreateAddressOriginUseCase,
    private readonly syncBalance: SyncBalanceUseCase,
    private readonly syncAddressStatus: SyncAddressStatusUseCase | null = null,
  ) {}

  async execute(
    walletId: string,
    network: BitcoinNetwork,
    onProgress?: (progress: ImportSyncProgress) => void,
  ): Promise<ImportSyncResult> {
    const origins: AddressOrigin[] = [];
    const allFetchedTxs = new Map<string, Transaction[]>();
    const addressesWithActivity = new Set<string>();

    const preSyncTxIds = new Set(
      (await this.transactionRepository.list(walletId)).map(tx => tx.txid ?? tx.id),
    );

    // Phase 1: Adaptive parallel account + chain scan
    for (let accountIndex = 0; accountIndex < MAX_ACCOUNTS; accountIndex++) {
      const scan = await this.scanAccount(
        walletId, network, accountIndex, onProgress, allFetchedTxs, addressesWithActivity,
      );

      if (accountIndex > 0 && !scan.hasActivity) break;

      const originName = accountIndex === 0 ? DEFAULT_ORIGIN_NAME : `Account ${accountIndex}`;
      const origin = await this.getOrCreateOrigin(walletId, originName, network);
      origins.push(origin);

      await this.extendAddressPool(walletId, network, origin, scan);
      await this.saveAccountTransactions(walletId, origin, scan.txsByAddress);
    }

    // Phase 2: Smart UTXO sync — only addresses with confirmed transaction history
    onProgress?.({ phase: 'syncing', accountIndex: 0, addressIndex: 0, txFound: false });
    const newUtxos = await this.fetchAndSaveUtxos(walletId, network, addressesWithActivity);

    // Phase 3: Balance aggregation
    await this.syncBalance.execute(walletId);

    // Phase 4: Address status update using already-fetched tx data (no extra API calls)
    if (this.syncAddressStatus) {
      await this.syncAddressStatus.execute(walletId, network, allFetchedTxs);
    }

    const newTransactions = this.countNewTransactions(allFetchedTxs, preSyncTxIds);
    return { origins, newTransactions, newUtxos };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async scanAccount(
    walletId: string,
    network: BitcoinNetwork,
    accountIndex: number,
    onProgress: ((p: ImportSyncProgress) => void) | undefined,
    allFetchedTxs: Map<string, Transaction[]>,
    addressesWithActivity: Set<string>,
  ): Promise<AccountScanResult> {
    const scannedReceive: ScannedAddress[] = [];
    const scannedChange: ScannedAddress[] = [];
    const txsByAddress = new Map<string, Transaction[]>();

    // Scan both chains concurrently — each chain is fully self-contained and
    // writes to disjoint address keys (receive-* vs change-*), so no collisions.
    await Promise.all([
      this.scanChain(
        walletId, network, accountIndex, 'receive',
        scannedReceive, txsByAddress, allFetchedTxs, addressesWithActivity, onProgress,
      ),
      this.scanChain(
        walletId, network, accountIndex, 'change',
        scannedChange, txsByAddress, allFetchedTxs, addressesWithActivity, undefined,
      ),
    ]);

    const hasActivity =
      scannedReceive.some(a => a.hasTxs) || scannedChange.some(a => a.hasTxs);

    return { scannedReceive, scannedChange, txsByAddress, hasActivity };
  }

  /**
   * Scans a single derivation chain (receive or change) using an adaptive batch
   * strategy. Each batch generates only as many new addresses as are needed to
   * potentially close the pool gap, and all addresses within a batch are queried
   * in parallel.
   *
   * The chain stops when the TOTAL count of fresh (transaction-free) addresses
   * in the scanned range reaches `poolSize`. Unlike a trailing-consecutive count,
   * this correctly accounts for fresh addresses that appear before a used address
   * (e.g. indices 1, 2 are still fresh even though index 3 was used before index 4).
   */
  private async scanChain(
    walletId: string,
    network: BitcoinNetwork,
    accountIndex: number,
    chain: 'receive' | 'change',
    scanned: ScannedAddress[],
    txsByAddress: Map<string, Transaction[]>,
    allFetchedTxs: Map<string, Transaction[]>,
    addressesWithActivity: Set<string>,
    onProgress: ((p: ImportSyncProgress) => void) | undefined,
  ): Promise<void> {
    const poolSize = chain === 'receive' ? minAvailableReceive : minAvailableChange;
    let totalFresh = 0; // total fresh (no-tx) addresses found so far across the entire chain
    let index = 0;

    while (totalFresh < poolSize) {
      const toGenerate = poolSize - totalFresh;

      // Generate addresses for this batch in parallel
      const addresses = await Promise.all(
        Array.from({ length: toGenerate }, (_, i) =>
          chain === 'receive'
            ? this.addressProvider.getReceiveAddress(walletId, network, index + i, accountIndex)
            : this.addressProvider.getChangeAddress(walletId, network, index + i, accountIndex),
        ),
      );

      // Emit initial progress for each address in the batch
      addresses.forEach((_, i) =>
        onProgress?.({ phase: 'discovering', accountIndex, addressIndex: index + i, txFound: false }),
      );

      // Query all transactions in parallel; treat errors conservatively as empty
      const results = await Promise.allSettled(
        addresses.map(address => this.blockchainProvider.getTransactions(address, network)),
      );

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const txs: Transaction[] =
          results[i].status === 'fulfilled' ? results[i].value : [];
        const hasTxs = txs.length > 0;

        scanned.push({ address, chain, index: index + i, hasTxs });
        txsByAddress.set(address, txs);
        allFetchedTxs.set(address, txs);

        if (hasTxs) {
          addressesWithActivity.add(address);
          onProgress?.({ phase: 'discovering', accountIndex, addressIndex: index + i, txFound: true });
        } else {
          totalFresh++;
        }
      }

      index += toGenerate;
    }
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

  /**
   * `createOriginUseCase` already persisted indices 0..poolSize-1 for each chain.
   * Persist the remaining scanned addresses so the full discovered range is
   * available for the UTXO and status sync passes.
   */
  private async extendAddressPool(
    walletId: string,
    network: BitcoinNetwork,
    origin: AddressOrigin,
    scan: AccountScanResult,
  ): Promise<void> {
    const now = new Date().toISOString();
    const toSave: WalletAddress[] = [];

    const allScanned = [...scan.scannedReceive, ...scan.scannedChange];
    for (const { address, chain, index, hasTxs } of allScanned) {
      const minPool = chain === 'receive' ? minAvailableReceive : minAvailableChange;
      if (index < minPool) continue; // already persisted by createOriginUseCase

      toSave.push({
        id: generateId(),
        walletId,
        originId: origin.id,
        originName: origin.name,
        address,
        path: derivationPathForAddress(network, origin.accountIndex, chain, index),
        accountIndex: origin.accountIndex,
        chain,
        index,
        status: hasTxs ? 'received' : 'fresh',
        totalReceivedSats: 0,
        totalSentSats: 0,
        txCount: 0,
        incomingTxCount: 0,
        outgoingTxCount: 0,
        hasUtxos: false,
        isFrozen: false,
        createdAt: now,
        usedAt: hasTxs ? now : null,
        lastSyncedAt: null,
      });
    }

    if (toSave.length > 0) {
      await this.walletAddressRepository.saveMany(toSave);
    }
  }

  /**
   * Merges transactions from all addresses of an account and upserts them.
   * When the same txid appears as outgoing from the spending address and incoming
   * from the change address, the net sent amount is stored.
   */
  private async saveAccountTransactions(
    walletId: string,
    origin: AddressOrigin,
    txsByAddress: Map<string, Transaction[]>,
  ): Promise<void> {
    const txMap = new Map<string, Transaction>();

    for (const [address, txs] of txsByAddress) {
      for (const tx of txs) {
        const key = tx.txid ?? tx.id;
        const annotated: Transaction = {
          ...tx,
          address,
          originId: origin.id,
          originName: origin.name,
        };

        const existing = txMap.get(key);
        if (!existing) {
          txMap.set(key, annotated);
          continue;
        }

        if (existing.direction !== annotated.direction) {
          const outgoing = existing.direction === 'outgoing' ? existing : annotated;
          const incoming = existing.direction === 'incoming' ? existing : annotated;
          txMap.set(key, {
            ...outgoing,
            amountSats: Math.max(0, outgoing.amountSats - incoming.amountSats),
          });
        }
      }
    }

    if (txMap.size > 0) {
      await this.transactionRepository.upsertAll(walletId, Array.from(txMap.values()));
    }
  }

  /**
   * Queries UTXOs only for addresses that had at least one transaction.
   * Skips fresh addresses and avoids unnecessary API calls.
   */
  private async fetchAndSaveUtxos(
    walletId: string,
    network: BitcoinNetwork,
    addressesWithActivity: Set<string>,
  ): Promise<number> {
    const freshUtxos: Utxo[] = [];

    for (const address of addressesWithActivity) {
      try {
        const utxos = await this.blockchainProvider.getUtxos(address, network);
        freshUtxos.push(...utxos);
      } catch {
        // Best-effort: skip addresses that fail
      }
    }

    const localUtxos = await this.utxoRepository.listByWallet(walletId);
    const localSet = new Set(localUtxos.map(u => `${u.txid}:${u.vout}`));
    const newCount = freshUtxos.filter(u => !localSet.has(`${u.txid}:${u.vout}`)).length;

    await this.utxoRepository.replaceAll(walletId, freshUtxos);
    return newCount;
  }

  private countNewTransactions(
    allFetchedTxs: Map<string, Transaction[]>,
    preSyncTxIds: Set<string>,
  ): number {
    const seen = new Set<string>();
    for (const txs of allFetchedTxs.values()) {
      for (const tx of txs) seen.add(tx.txid ?? tx.id);
    }
    return [...seen].filter(id => !preSyncTxIds.has(id)).length;
  }
}
