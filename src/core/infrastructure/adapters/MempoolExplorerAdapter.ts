import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { BlockchainExplorer } from '../../domain/repositories/BlockchainExplorer';

const EXPLORER_BASE_URLS: Record<BitcoinNetwork, string> = {
  mainnet: 'https://mempool.space',
  testnet: 'https://mempool.space/testnet4',  // testnet = testnet4, matching the API layer
  testnet3: 'https://mempool.space/testnet',
  testnet4: 'https://mempool.space/testnet4',
};

export class MempoolExplorerAdapter implements BlockchainExplorer {
  getExplorerUrl(txid: string, network: BitcoinNetwork): string {
    return `${EXPLORER_BASE_URLS[network]}/tx/${txid}`;
  }
}
