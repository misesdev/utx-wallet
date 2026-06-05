import type { AccountId } from './Account';
import type { BitcoinNetwork } from './Network';

export type AddressType = 'p2wpkh' | 'p2tr';

export type Address = {
  id: string;
  accountId: AccountId;
  value: string;
  network: BitcoinNetwork;
  type: AddressType;
  isChange: boolean;
  index: number;
};
