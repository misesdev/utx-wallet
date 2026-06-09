import type { NetworkConfig, NodeConnectionTestResult } from '../entities/Network';
import type { PersonalNode } from '../entities/PersonalNode';

export interface NodeRepository {
  getNetworkConfig(): Promise<NetworkConfig>;
  setNetworkConfig(config: NetworkConfig): Promise<void>;
  ping(): Promise<boolean>;
}

export interface NodeConnectionTester {
  testConnection(config: NetworkConfig): Promise<NodeConnectionTestResult>;
  testNode(node: PersonalNode): Promise<NodeConnectionTestResult>;
}
