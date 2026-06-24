import type { BitcoinNetwork, NetworkConfig } from '../../domain/entities/Network';
import type { AddressBalance, BlockchainProvider, FeeRates, RawTransaction, RemoteTransactionStatus } from '../../domain/repositories/BlockchainProvider';
import type { NodeConnectionTester, NodeRepository } from '../../domain/repositories/NodeRepository';
import type { Transaction } from '../../domain/entities/Transaction';
import type { Utxo } from '../../domain/entities/Utxo';

export class NodeProviderSelector implements NodeRepository, BlockchainProvider {
  constructor(
    private readonly configRepository: NodeRepository,
    private readonly publicProvider: BlockchainProvider,
    private readonly personalProvider: BlockchainProvider & NodeRepository & NodeConnectionTester,
    private readonly multiNodeProvider: BlockchainProvider,
  ) {}

  getNetworkConfig(): Promise<NetworkConfig> {
    return this.configRepository.getNetworkConfig();
  }

  async setNetworkConfig(config: NetworkConfig): Promise<void> {
    await this.configRepository.setNetworkConfig(config);
    await this.personalProvider.setNetworkConfig(config);
  }

  async ping(): Promise<boolean> {
    return this.configRepository.ping();
  }

  async getBalance(address: string, network: BitcoinNetwork): Promise<AddressBalance> {
    return this.multiNodeProvider.getBalance(address, network);
  }

  async getUtxos(address: string, network: BitcoinNetwork): Promise<Utxo[]> {
    return this.multiNodeProvider.getUtxos(address, network);
  }

  async getTransactions(address: string, network: BitcoinNetwork): Promise<Transaction[]> {
    return this.multiNodeProvider.getTransactions(address, network);
  }

  async getTransactionStatus(txid: string): Promise<RemoteTransactionStatus> {
    return this.multiNodeProvider.getTransactionStatus(txid);
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.multiNodeProvider.getCurrentBlockHeight();
  }

  async getFeeRates(): Promise<FeeRates> {
    return this.multiNodeProvider.getFeeRates();
  }

  async broadcastTransaction(rawHex: string): Promise<string> {
    return this.multiNodeProvider.broadcastTransaction(rawHex);
  }

  async getRawTransaction(txid: string): Promise<RawTransaction> {
    return this.multiNodeProvider.getRawTransaction(txid);
  }
}
