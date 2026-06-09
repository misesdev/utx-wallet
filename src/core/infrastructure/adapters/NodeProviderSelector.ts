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
  ) {}

  getNetworkConfig(): Promise<NetworkConfig> {
    return this.configRepository.getNetworkConfig();
  }

  async setNetworkConfig(config: NetworkConfig): Promise<void> {
    await this.configRepository.setNetworkConfig(config);
    await this.personalProvider.setNetworkConfig(config);
  }

  async ping(): Promise<boolean> {
    const config = await this.getNetworkConfig();
    if (config.nodeMode === 'personal-node') {
      return this.personalProvider.ping();
    }
    return this.configRepository.ping();
  }

  async getBalance(address: string, network: BitcoinNetwork): Promise<AddressBalance> {
    return this.selectProvider().then(provider => provider.getBalance(address, network));
  }

  async getUtxos(address: string, network: BitcoinNetwork): Promise<Utxo[]> {
    return this.selectProvider().then(provider => provider.getUtxos(address, network));
  }

  async getTransactions(address: string, network: BitcoinNetwork): Promise<Transaction[]> {
    return this.selectProvider().then(provider => provider.getTransactions(address, network));
  }

  async getTransactionStatus(txid: string): Promise<RemoteTransactionStatus> {
    return this.selectProvider().then(provider => provider.getTransactionStatus(txid));
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.selectProvider().then(provider => provider.getCurrentBlockHeight());
  }

  async getFeeRates(): Promise<FeeRates> {
    return this.selectProvider().then(provider => provider.getFeeRates());
  }

  async broadcastTransaction(rawHex: string): Promise<string> {
    return this.selectProvider().then(provider => provider.broadcastTransaction(rawHex));
  }

  async getRawTransaction(txid: string): Promise<RawTransaction> {
    return this.selectProvider().then(provider => provider.getRawTransaction(txid));
  }

  private async selectProvider(): Promise<BlockchainProvider> {
    const config = await this.getNetworkConfig();
    return config.nodeMode === 'personal-node' ? this.personalProvider : this.publicProvider;
  }
}
