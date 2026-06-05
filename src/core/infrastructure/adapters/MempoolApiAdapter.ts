import type { NodeRepository } from '../../domain/repositories/NodeRepository';
import type { NetworkConfig } from '../../domain/entities/Network';
import { MempoolApiClient } from '../api/MempoolApiClient';
import { NetworkConfigStorage } from '../storage/NetworkConfigStorage';

export class MempoolApiAdapter implements NodeRepository {
  private cachedConfig: NetworkConfig;

  constructor(
    private readonly mempoolApiClient: MempoolApiClient,
    private readonly networkConfigStorage: NetworkConfigStorage,
    defaultConfig: NetworkConfig,
  ) {
    this.cachedConfig = defaultConfig;
  }

  async getNetworkConfig(): Promise<NetworkConfig> {
    const stored = await this.networkConfigStorage.load();
    if (stored) {
      this.cachedConfig = stored;
    }
    return this.cachedConfig;
  }

  async setNetworkConfig(config: NetworkConfig): Promise<void> {
    await this.networkConfigStorage.save(config);
    this.cachedConfig = config;
  }

  async ping(): Promise<boolean> {
    try {
      await this.mempoolApiClient.healthcheck();
      return true;
    } catch {
      return false;
    }
  }
}
