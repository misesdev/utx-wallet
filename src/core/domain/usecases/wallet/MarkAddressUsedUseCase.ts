import type { AddressRepository } from '../../repositories/AddressRepository';

export class MarkAddressUsedUseCase {
  constructor(private readonly addressRepository: AddressRepository) {}

  execute(addressValue: string): Promise<void> {
    return this.addressRepository.markUsed(addressValue);
  }
}
