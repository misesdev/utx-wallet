import type { BitcoinNetwork } from '../../entities/Network';
import type { WalletAddress } from '../../entities/WalletAddress';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import { AppError } from '../../../application/errors/AppError';
import type { EnsureAddressPoolUseCase } from './EnsureAddressPoolUseCase';

export class GetNextChangeAddressUseCase {
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
    // Default origin for change if none specified
    const origin = originId
      ? await this.originRepository.findById(originId)
      : await this.originRepository.findDefault(walletId);

    if (!origin) throw new AppError('Origin not found', 'ORIGIN_NOT_FOUND');

    await this.ensureAddressPool.execute(walletId, network, origin.id);

    const freshAddresses = await this.walletAddressRepository.findFreshByChain(
      walletId,
      origin.id,
      'change',
    );

    if (freshAddresses.length === 0) {
      throw new AppError('No fresh change addresses available', 'NO_FRESH_ADDRESS');
    }

    const address = freshAddresses.sort((a, b) => a.index - b.index)[0];

    if (reserve) {
      const now = new Date().toISOString();
      await this.walletAddressRepository.updateStatus(address.id, 'reserved', now);
      await this.ensureAddressPool.execute(walletId, network, origin.id);
      return { ...address, status: 'reserved', usedAt: now };
    }

    return address;
  }
}
