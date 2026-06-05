import type { NetworkConfig } from '../entities/Network';

export interface NodeRepository {
  getNetworkConfig(): Promise<NetworkConfig>;
  setNetworkConfig(config: NetworkConfig): Promise<void>;
  ping(): Promise<boolean>;
}
