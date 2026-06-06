import type { BitcoinNetwork, NetworkConfig, NodeConnectionTestResult } from '../../domain/entities/Network';
import type { NodeRepository } from '../../domain/repositories/NodeRepository';
import { ChangeNetworkUseCase } from '../../domain/usecases/network/ChangeNetworkUseCase';
import { NodeConnectionTestUseCase } from '../../domain/usecases/network/NodeConnectionTestUseCase';

export class NetworkService {
  constructor(
    private readonly nodeRepository: NodeRepository,
    private readonly nodeConnectionTestUseCase: NodeConnectionTestUseCase,
    private readonly changeNetworkUseCase: ChangeNetworkUseCase,
  ) {}

  getConfig(): Promise<NetworkConfig> {
    return this.nodeRepository.getNetworkConfig();
  }

  setConfig(config: NetworkConfig): Promise<void> {
    return this.nodeRepository.setNetworkConfig(config);
  }

  changeNetwork(targetNetwork: BitcoinNetwork, walletNetwork?: BitcoinNetwork): Promise<NetworkConfig> {
    return this.changeNetworkUseCase.execute(targetNetwork, walletNetwork);
  }

  checkConnection(): Promise<boolean> {
    return this.nodeRepository.ping();
  }

  testNodeConnection(config: NetworkConfig): Promise<NodeConnectionTestResult> {
    return this.nodeConnectionTestUseCase.execute(config);
  }
}
