import type { NetworkConfig, NodeConnectionTestResult } from '../../entities/Network';
import type { NodeConnectionTester } from '../../repositories/NodeRepository';

export class NodeConnectionTestUseCase {
  constructor(private readonly nodeConnectionTester: NodeConnectionTester) {}

  execute(config: NetworkConfig): Promise<NodeConnectionTestResult> {
    return this.nodeConnectionTester.testConnection(config);
  }
}
