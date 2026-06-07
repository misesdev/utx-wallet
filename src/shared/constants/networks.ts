import type { BitcoinNetwork } from '../../core/domain/entities/Network';

// Only two user-facing networks. The legacy values (testnet3/testnet4) remain
// valid in BitcoinNetwork for backward compat with stored wallets.
export const SUPPORTED_NETWORKS: BitcoinNetwork[] = ['mainnet', 'testnet'];

export const DEFAULT_NETWORK: BitcoinNetwork = 'testnet';

// Networks treated as "testnet" for display / filtering purposes
export const TESTNET_NETWORKS: ReadonlyArray<BitcoinNetwork> = [
  'testnet',
  'testnet3',
  'testnet4',
];
