import type { Address } from './Address';

export type Utxo = {
  txid: string;
  vout: number;
  valueSats: number;
  address: Address['value'];
  isConfirmed: boolean;
  isFrozen?: boolean;
};
