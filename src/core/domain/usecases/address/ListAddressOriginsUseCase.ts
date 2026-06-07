import type { AddressOrigin } from '../../entities/AddressOrigin';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';

export class ListAddressOriginsUseCase {
  constructor(private readonly originRepository: AddressOriginRepository) {}

  async execute(walletId: string): Promise<AddressOrigin[]> {
    const all = await this.originRepository.findByWallet(walletId);
    return all.filter(o => !o.archivedAt);
  }
}
