import type { Address } from '../entities/Address';

export interface AddressRepository {
  findByWallet(walletId: string): Promise<Address[]>;
  findReceiveAddresses(walletId: string, accountIndex?: number): Promise<Address[]>;
  findChangeAddresses(walletId: string, accountIndex?: number): Promise<Address[]>;
  save(address: Address): Promise<void>;
  saveMany(addresses: Address[]): Promise<void>;
  markUsed(addressValue: string): Promise<void>;
}
