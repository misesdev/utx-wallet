import type { BitcoinNetwork } from '../entities/Network';

export interface BlockchainExplorer {
  getExplorerUrl(txid: string, network: BitcoinNetwork): string;
}
