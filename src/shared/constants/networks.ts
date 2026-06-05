import type { BitcoinNetwork } from '../../core/domain/entities/Network';

export const SUPPORTED_NETWORKS: BitcoinNetwork[] = [
  'mainnet',
  'testnet',
  'testnet3',
  'testnet4',
];

export const DEFAULT_NETWORK: BitcoinNetwork = 'testnet4';
