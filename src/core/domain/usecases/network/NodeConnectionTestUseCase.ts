import type { NetworkConfig, NodeConnectionTestResult } from '../../entities/Network';
import type { NodeConnectionTester } from '../../repositories/NodeRepository';
import type { PersonalNode } from '../../entities/PersonalNode';

export class NodeConnectionTestUseCase {
  constructor(private readonly nodeConnectionTester: NodeConnectionTester) {}

  execute(config: NetworkConfig): Promise<NodeConnectionTestResult> {
    return this.nodeConnectionTester.testConnection(config);
  }

  executeForNode(node: PersonalNode): Promise<NodeConnectionTestResult> {
    return this.nodeConnectionTester.testNode(node);
  }
}
