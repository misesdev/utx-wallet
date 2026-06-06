import type { Address } from '../../domain/entities/Address';
import type { AddressRepository } from '../../domain/repositories/AddressRepository';
import { AddressStorage } from '../storage/AddressStorage';

export class AddressRepositoryImpl implements AddressRepository {
  constructor(private readonly addressStorage: AddressStorage) {}

  findByWallet(walletId: string): Promise<Address[]> {
    return this.addressStorage.listByWallet(walletId);
  }

  findReceiveAddresses(walletId: string): Promise<Address[]> {
    return this.addressStorage.listReceiveByWallet(walletId);
  }

  findChangeAddresses(walletId: string): Promise<Address[]> {
    return this.addressStorage.listChangeByWallet(walletId);
  }

  save(address: Address): Promise<void> {
    return this.addressStorage.save(address.accountId, address);
  }

  async saveMany(addresses: Address[]): Promise<void> {
    for (const address of addresses) {
      await this.save(address);
    }
  }

  markUsed(addressValue: string): Promise<void> {
    return this.addressStorage.markUsed(addressValue);
  }
}
