import type { Address } from '../../entities/Address';
import type { AddressRepository } from '../../repositories/AddressRepository';
import { GenerateReceiveAddressUseCase } from './GenerateReceiveAddressUseCase';

export class GetCurrentReceiveAddressUseCase {
  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly generateReceiveAddress: GenerateReceiveAddressUseCase,
  ) {}

  async execute(walletId: string): Promise<Address> {
    const addresses = await this.addressRepository.findReceiveAddresses(walletId);
    const unused = addresses.filter(a => !a.isUsed);

    if (unused.length > 0) {
      return unused[0];
    }

    return this.generateReceiveAddress.execute(walletId);
  }
}
