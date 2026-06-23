import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../entities/Network';
import type { Utxo } from '../../entities/Utxo';
import { delay } from '../../../../shared/utils/asyncUtils';
import type { OnSyncProgress } from './SyncProgress';

export type SyncUtxosResult = {
  newCount: number;
  spentCount: number;
};

export type SyncUtxosOpts = {
  parallel?: boolean;
  requestDelayMs?: number;
};

export class SyncUtxosUseCase {
  constructor(
    private readonly utxoRepository: UtxoRepository,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly requestDelayMs = 0,
  ) {}

  async execute(
    walletId: string,
    addresses: string[],
    network: BitcoinNetwork,
    onProgress?: OnSyncProgress,
    opts?: SyncUtxosOpts,
  ): Promise<SyncUtxosResult> {
    const parallel = opts?.parallel ?? false;
    const delayMs = opts?.requestDelayMs ?? this.requestDelayMs;

    const allLocalUtxos = await this.utxoRepository.listByWallet(walletId);
    const primaryAddressSet = new Set(addresses);

    // Addresses with stored UTXOs that are NOT in the primary sync batch.
    // These must also be verified against the blockchain: another device sharing
    // the same private key may have spent those UTXOs without this wallet knowing.
    // Leaving them untouched would cause double-spend errors on the next send.
    const verifyAddresses = [
      ...new Set(
        allLocalUtxos
          .filter(u => !primaryAddressSet.has(u.address))
          .map(u => u.address),
      ),
    ];

    // Primary addresses first (with progress reporting), then verify addresses (silent).
    const primaryIndexMap = new Map(addresses.map((addr, i) => [addr, i]));
    const allFetchAddresses = [...addresses, ...verifyAddresses];

    const freshByAddress = new Map<string, Utxo[]>();
    const fetchAddress = async (addr: string): Promise<void> => {
      const utxos = await this.blockchainProvider.getUtxos(addr, network);
      freshByAddress.set(addr, utxos);
    };

    if (parallel) {
      addresses.forEach((addr, i) =>
        onProgress?.({ currentAddress: addr, currentIndex: i, totalAddresses: addresses.length, phase: 'utxos' }),
      );
      await Promise.all(allFetchAddresses.map(addr => fetchAddress(addr)));
    } else {
      for (let i = 0; i < allFetchAddresses.length; i++) {
        const addr = allFetchAddresses[i];
        const primaryIdx = primaryIndexMap.get(addr);
        if (primaryIdx !== undefined) {
          onProgress?.({ currentAddress: addr, currentIndex: primaryIdx, totalAddresses: addresses.length, phase: 'utxos' });
        }
        await fetchAddress(addr);
        if (i < allFetchAddresses.length - 1) {
          await delay(delayMs);
        }
      }
    }

    // Build per-address local lookup for frozen-state preservation
    const localByAddress = new Map<string, Utxo[]>();
    for (const u of allLocalUtxos) {
      const list = localByAddress.get(u.address) ?? [];
      list.push(u);
      localByAddress.set(u.address, list);
    }

    // Compute new/spent counts from primary addresses only (metrics are per-sync-batch)
    const primaryLocalUtxos = addresses.flatMap(addr => localByAddress.get(addr) ?? []);
    const freshPrimaryUtxos = addresses.flatMap(addr => freshByAddress.get(addr) ?? []);
    const freshPrimarySet = new Set(freshPrimaryUtxos.map(u => `${u.txid}:${u.vout}`));
    const localPrimarySet = new Set(primaryLocalUtxos.map(u => `${u.txid}:${u.vout}`));

    const spentCount = primaryLocalUtxos.filter(u => !freshPrimarySet.has(`${u.txid}:${u.vout}`)).length;
    const newCount = freshPrimaryUtxos.filter(u => !localPrimarySet.has(`${u.txid}:${u.vout}`)).length;

    // Build the final UTXO set from all fetched addresses, preserving frozen state.
    // Addresses where the blockchain returned an empty list had all UTXOs spent — they are
    // simply not added back, effectively removing them from local storage.
    const allRefreshedUtxos: Utxo[] = [];
    for (const [addr, freshUtxos] of freshByAddress) {
      const localForAddr = localByAddress.get(addr) ?? [];
      const frozenSet = new Set(localForAddr.filter(u => u.isFrozen).map(u => `${u.txid}:${u.vout}`));
      for (const utxo of freshUtxos) {
        allRefreshedUtxos.push({
          ...utxo,
          isFrozen: frozenSet.has(`${utxo.txid}:${utxo.vout}`) || utxo.isFrozen,
        });
      }
    }

    await this.utxoRepository.replaceAll(walletId, allRefreshedUtxos);

    return { newCount, spentCount };
  }
}
