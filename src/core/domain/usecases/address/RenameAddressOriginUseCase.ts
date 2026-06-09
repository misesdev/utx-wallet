import type { AddressOrigin } from '../../entities/AddressOrigin';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import { AppError } from '../../../application/errors/AppError';

export class RenameAddressOriginUseCase {
  constructor(
    private readonly originRepository: AddressOriginRepository,
    private readonly walletAddressRepository: WalletAddressRepository | null = null,
  ) {}

  async execute(originId: string, name: string): Promise<AddressOrigin> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new AppError('Account name is required', 'INVALID_ACCOUNT_NAME');
    }
    if (trimmed.length > 32) {
      throw new AppError('Account name must have 32 characters or less', 'INVALID_ACCOUNT_NAME');
    }

    const origin = await this.originRepository.findById(originId);
    if (!origin) {
      throw new AppError('Account not found', 'ACCOUNT_NOT_FOUND');
    }

    const siblings = await this.originRepository.findByWallet(origin.walletId);
    if (siblings.some(item => item.id !== origin.id && item.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new AppError('Account name already exists', 'ACCOUNT_EXISTS');
    }

    const renamed = { ...origin, name: trimmed };
    await this.originRepository.save(renamed);
    await this.walletAddressRepository?.updateOriginName(origin.id, trimmed);
    return renamed;
  }
}
