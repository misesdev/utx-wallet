import type { NetworkConfig, NodeConnectionTestResult } from '../entities/Network';

export interface NodeRepository {
  getNetworkConfig(): Promise<NetworkConfig>;
  setNetworkConfig(config: NetworkConfig): Promise<void>;
  ping(): Promise<boolean>;
}

export interface NodeConnectionTester {
  testConnection(config: NetworkConfig): Promise<NodeConnectionTestResult>;
}
