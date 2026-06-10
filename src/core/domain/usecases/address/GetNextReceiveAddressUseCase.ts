import type { BitcoinNetwork } from '../../entities/Network';
import type { WalletAddress } from '../../entities/WalletAddress';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import { AppError } from '../../../application/errors/AppError';
import type { EnsureAddressPoolUseCase } from './EnsureAddressPoolUseCase';

export class GetNextReceiveAddressUseCase {
  constructor(
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly originRepository: AddressOriginRepository,
    private readonly ensureAddressPool: EnsureAddressPoolUseCase,
  ) {}

  async execute(
    walletId: string,
    network: BitcoinNetwork,
    originId?: string,
    reserve = false,
  ): Promise<WalletAddress> {
    const origin = originId
      ? await this.originRepository.findById(originId)
      : await this.originRepository.findDefault(walletId);

    if (!origin) throw new AppError('Origin not found', 'ORIGIN_NOT_FOUND');

    // Ensure pool has at least the minimum before returning
    await this.ensureAddressPool.execute(walletId, network, origin.id);

    // Include `received` addresses: they have received funds but the key has not
    // been exposed as a transaction input, so they remain valid for receiving.
    // Only `spent_once` (and `archived`) addresses are permanently discarded.
    const availableAddresses = await this.walletAddressRepository.findFreshByChain(
      walletId,
      origin.id,
      'receive',
      ['received'],
    );

    if (availableAddresses.length === 0) {
      throw new AppError('No fresh receive addresses available', 'NO_FRESH_ADDRESS');
    }

    // Oldest available (lowest index) — already ordered by storage, but sort defensively
    const address = availableAddresses.sort((a, b) => a.index - b.index)[0];

    if (reserve) {
      const now = new Date().toISOString();
      await this.walletAddressRepository.updateStatus(address.id, 'reserved', now);
      // Replenish pool after reserving
      await this.ensureAddressPool.execute(walletId, network, origin.id);
      return { ...address, status: 'reserved', usedAt: now };
    }

    return address;
  }
}
