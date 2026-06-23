import type { BitcoinNetwork, NetworkConfig, NodeConnectionTestResult } from '../../domain/entities/Network';
import type { PersonalNode } from '../../domain/entities/PersonalNode';
import type { NodeConnectionTester, NodeRepository } from '../../domain/repositories/NodeRepository';
import { ChangeNetworkUseCase } from '../../domain/usecases/network/ChangeNetworkUseCase';
import { NodeConnectionTestUseCase } from '../../domain/usecases/network/NodeConnectionTestUseCase';

function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class NetworkService {
  constructor(
    private readonly nodeRepository: NodeRepository,
    private readonly nodeConnectionTestUseCase: NodeConnectionTestUseCase,
    private readonly changeNetworkUseCase: ChangeNetworkUseCase,
    private readonly nodeConnectionTester: NodeConnectionTester,
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

  testPersonalNode(node: PersonalNode): Promise<NodeConnectionTestResult> {
    return this.nodeConnectionTester.testNode(node);
  }

  async listPersonalNodes(): Promise<PersonalNode[]> {
    const config = await this.getConfig();
    return config.personalNodes ?? [];
  }

  async addPersonalNode(input: Omit<PersonalNode, 'id'>): Promise<PersonalNode> {
    const config = await this.getConfig();
    const nodes = config.personalNodes ?? [];
    const node: PersonalNode = { ...input, id: generateNodeId() };
    const updatedNodes = [...nodes, node];
    // Auto-activate personal-node mode when the first node is added for the active network
    const alreadyHasNodeForActiveNetwork = nodes.some(n => n.network === config.network);
    const isNewNodeForActiveNetwork = input.network === config.network;
    const nodeMode =
      !alreadyHasNodeForActiveNetwork && isNewNodeForActiveNetwork
        ? 'personal-node'
        : config.nodeMode;
    await this.setConfig({ ...config, personalNodes: updatedNodes, nodeMode });
    return node;
  }

  async removePersonalNode(nodeId: string): Promise<void> {
    const config = await this.getConfig();
    const existingNodes = config.personalNodes ?? [];
    const removedNode = existingNodes.find(n => n.id === nodeId);
    const nodes = existingNodes.filter(n => n.id !== nodeId);
    // Auto-deactivate only when removing a node for the active network leaves no remaining nodes for it
    const removingActiveNetworkNode = removedNode?.network === config.network;
    const stillHasNodeForActiveNetwork = nodes.some(n => n.network === config.network);
    const nodeMode =
      removingActiveNetworkNode && !stillHasNodeForActiveNetwork && config.nodeMode === 'personal-node'
        ? 'public-api'
        : config.nodeMode;
    await this.setConfig({ ...config, personalNodes: nodes, nodeMode });
  }

  async updatePersonalNode(node: PersonalNode): Promise<void> {
    const config = await this.getConfig();
    const nodes = (config.personalNodes ?? []).map(n => n.id === node.id ? node : n);
    await this.setConfig({ ...config, personalNodes: nodes });
  }

  async reorderPersonalNodes(orderedIds: string[]): Promise<void> {
    const config = await this.getConfig();
    const nodes = config.personalNodes ?? [];
    const updated = orderedIds
      .map((id, index) => {
        const node = nodes.find(n => n.id === id);
        return node ? { ...node, priority: index + 1 } : null;
      })
      .filter((n): n is PersonalNode => n !== null);
    const remaining = nodes.filter(n => !orderedIds.includes(n.id));
    await this.setConfig({ ...config, personalNodes: [...updated, ...remaining] });
  }

  async setPublicFallback(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    await this.setConfig({ ...config, allowPublicFallback: enabled });
  }
}
