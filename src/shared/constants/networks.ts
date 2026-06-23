import type { BitcoinNetwork } from '../../core/domain/entities/Network';

// testnet4 is the canonical testnet. Legacy values 'testnet' and 'testnet3'
// are kept valid in BitcoinNetwork for backward-compat with stored wallets/nodes.
export const SUPPORTED_NETWORKS: BitcoinNetwork[] = ['mainnet', 'testnet4'];

export const DEFAULT_NETWORK: BitcoinNetwork = 'testnet4';

// All values treated as testnet for display / filtering purposes
export const TESTNET_NETWORKS: ReadonlyArray<BitcoinNetwork> = [
  'testnet',
  'testnet3',
  'testnet4',
];

/**
 * Normalizes legacy testnet variants to the canonical 'testnet4'.
 * Use this in any comparison between stored network values so that a node
 * saved as 'testnet' matches a wallet stored as 'testnet4' and vice-versa.
 */
export function normalizeTestnet(network: BitcoinNetwork): BitcoinNetwork {
  if (network === 'testnet' || network === 'testnet3') return 'testnet4';
  return network;
}
