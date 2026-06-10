import type { BitcoinNetwork } from '../../entities/Network';
import type { AddressChain, AddressStatus } from '../../entities/WalletAddress';
import { ADDRESS_POLICY } from '../../entities/WalletAddress';
import type { AddressOrigin } from '../../entities/AddressOrigin';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { WalletAddressProvider } from '../../repositories/WalletAddressProvider';
import { derivationPathForAddress } from '../../services/AddressDerivationService';
import { generateId } from '../../../../shared/utils/generateId';

export class EnsureAddressPoolUseCase {
  constructor(
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly originRepository: AddressOriginRepository,
    private readonly walletAddressProvider: WalletAddressProvider,
  ) {}

  async execute(walletId: string, network: BitcoinNetwork, originId?: string): Promise<void> {
    const origins: AddressOrigin[] = originId
      ? await this.originRepository.findById(originId).then(o => (o ? [o] : []))
      : await this.originRepository.findByWallet(walletId);

    for (const origin of origins) {
      if (origin.archivedAt) continue;
      await this.ensureChain(walletId, network, origin, 'receive');
      await this.ensureChain(walletId, network, origin, 'change');
    }
  }

  private async ensureChain(
    walletId: string,
    network: BitcoinNetwork,
    origin: AddressOrigin,
    chain: AddressChain,
  ): Promise<void> {
    // For the receive chain, `received` addresses (incoming-only, key not yet exposed)
    // count toward the pool — only `spent_once` is permanently discarded.
    const additionalStatuses: AddressStatus[] = chain === 'receive' ? ['received'] : [];
    const availableCount = await this.walletAddressRepository.countFreshByChain(
      walletId,
      origin.id,
      chain,
      additionalStatuses,
    );

    const min =
      chain === 'receive' ? ADDRESS_POLICY.minAvailableReceive : ADDRESS_POLICY.minAvailableChange;
    const needed = min - availableCount;

    if (needed <= 0) return;

    const maxIndex = await this.walletAddressRepository.getMaxIndexByChain(
      walletId,
      origin.id,
      chain,
    );
    const startIndex = maxIndex + 1;
    const now = new Date().toISOString();
    const toCreate = [];

    for (let i = 0; i < needed; i++) {
      const idx = startIndex + i;
      const address =
        chain === 'receive'
          ? await this.walletAddressProvider.getReceiveAddress(
              walletId,
              network,
              idx,
              origin.accountIndex,
            )
          : await this.walletAddressProvider.getChangeAddress(
              walletId,
              network,
              idx,
              origin.accountIndex,
            );

      toCreate.push({
        id: generateId(),
        walletId,
        originId: origin.id,
        originName: origin.name,
        address,
        path: derivationPathForAddress(network, origin.accountIndex, chain, idx),
        accountIndex: origin.accountIndex,
        chain,
        index: idx,
        status: 'fresh' as const,
        totalReceivedSats: 0,
        totalSentSats: 0,
        txCount: 0,
        incomingTxCount: 0,
        outgoingTxCount: 0,
        hasUtxos: false,
        isFrozen: false,
        createdAt: now,
        usedAt: null,
        lastSyncedAt: null,
      });
    }

    await this.walletAddressRepository.saveMany(toCreate);
  }
}
