import type { AddressActivityChecker } from '../../domain/repositories/AddressActivityChecker';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { HttpClient } from '../api/HttpClient';
import { MempoolApiClient } from '../api/MempoolApiClient';

export class MempoolAddressActivityChecker implements AddressActivityChecker {
  constructor(private readonly httpClient: HttpClient) {}

  async getAddressTxCount(address: string, network: BitcoinNetwork): Promise<number> {
    const client = MempoolApiClient.forNetwork(this.httpClient, network);
    const response = await client.getAddress(address);
    return response.chain_stats.tx_count + response.mempool_stats.tx_count;
  }
}
