import type { BitcoinNetwork } from '../entities/Network';

export interface AddressActivityChecker {
  getAddressTxCount(address: string, network: BitcoinNetwork): Promise<number>;
}
