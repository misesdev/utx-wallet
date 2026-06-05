import type { NetworkConfig } from '../../domain/entities/Network';
import type { NodeRepository } from '../../domain/repositories/NodeRepository';

export class NetworkService {
  constructor(private readonly nodeRepository: NodeRepository) {}

  getConfig(): Promise<NetworkConfig> {
    return this.nodeRepository.getNetworkConfig();
  }

  setConfig(config: NetworkConfig): Promise<void> {
    return this.nodeRepository.setNetworkConfig(config);
  }

  checkConnection(): Promise<boolean> {
    return this.nodeRepository.ping();
  }
}
