import type { NetworkConfig } from '../../domain/entities/Network';
import type { NodeRepository } from '../../domain/repositories/NodeRepository';
import { DEFAULT_NETWORK } from '../../../shared/constants/networks';

export class PersonalNodeAdapter implements NodeRepository {
  private config: NetworkConfig = {
    network: DEFAULT_NETWORK,
    connectivityMode: 'offline',
    nodeMode: 'personal-node',
  };

  async getNetworkConfig(): Promise<NetworkConfig> {
    return this.config;
  }

  async setNetworkConfig(config: NetworkConfig): Promise<void> {
    this.config = config;
  }

  async ping(): Promise<boolean> {
    return Boolean(this.config.personalNodeUrl);
  }
}
