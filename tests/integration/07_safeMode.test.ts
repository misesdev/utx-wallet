/**
 * Integration: Safe Mode (Personal Node) Flow
 *
 * Tests the network configuration pipeline for activating/deactivating safe mode.
 * Safe mode = nodeMode: 'personal-node' with a personal node URL.
 *
 * Tests: NetworkService → NodeRepository → NetworkConfigStorage → InMemorySecureStorage
 *
 * Real: NetworkConfigStorage, NetworkService, ChangeNetworkUseCase
 * Mocked: SecureStorage (in-memory), NodeConnectionTester
 */
import { NetworkService } from '../../src/core/application/services/NetworkService';
import { ChangeNetworkUseCase } from '../../src/core/domain/usecases/network/ChangeNetworkUseCase';
import { NodeConnectionTestUseCase } from '../../src/core/domain/usecases/network/NodeConnectionTestUseCase';
import { NetworkConfigStorage } from '../../src/core/infrastructure/storage/NetworkConfigStorage';
import type { NodeRepository, NodeConnectionTester } from '../../src/core/domain/repositories/NodeRepository';
import type { NetworkConfig } from '../../src/core/domain/entities/Network';
import { createSecureStorageMock } from '../mocks/storage';

const DEFAULT_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

const PERSONAL_NODE_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'personal-node',
  personalNodeUrl: 'http://localhost',
  personalNodePort: 8332,
};

function makeNodeRepository(storage: NetworkConfigStorage): NodeRepository {
  return {
    async getNetworkConfig(): Promise<NetworkConfig> {
      return (await storage.load()) ?? DEFAULT_CONFIG;
    },
    async setNetworkConfig(config: NetworkConfig): Promise<void> {
      await storage.save(config);
    },
    async ping(): Promise<boolean> {
      return true;
    },
  };
}

function makeConnectionTester(status: 'connected' | 'disconnected' = 'connected'): jest.Mocked<NodeConnectionTester> {
  return {
    testConnection: jest.fn().mockResolvedValue({
      status,
      expectedNetwork: 'testnet4',
      actualNetwork: status === 'connected' ? 'testnet4' : undefined,
    }),
    testNode: jest.fn().mockResolvedValue({
      status,
      expectedNetwork: 'testnet4',
      actualNetwork: status === 'connected' ? 'testnet4' : undefined,
    }),
  };
}

function makeNetworkService() {
  const secureStorage = createSecureStorageMock();
  const networkConfigStorage = new NetworkConfigStorage(secureStorage);
  const nodeRepository = makeNodeRepository(networkConfigStorage);
  const tester = makeConnectionTester();

  const changeNetworkUseCase = new ChangeNetworkUseCase(nodeRepository);
  const nodeConnectionTestUseCase = new NodeConnectionTestUseCase(tester);

  const service = new NetworkService(nodeRepository, nodeConnectionTestUseCase, changeNetworkUseCase, tester);
  return { service, networkConfigStorage, tester };
}

describe('Integration: Safe Mode (Network Config)', () => {
  it('returns default public-api config when no config is stored', async () => {
    const { service } = makeNetworkService();
    const config = await service.getConfig();

    expect(config.nodeMode).toBe('public-api');
    expect(config.network).toBe('testnet4');
  });

  it('stores personal-node config when setConfig is called', async () => {
    const { service } = makeNetworkService();
    await service.setConfig(PERSONAL_NODE_CONFIG);

    const config = await service.getConfig();
    expect(config.nodeMode).toBe('personal-node');
    // Legacy fields are migrated to personalNodes on load
    const node = config.personalNodes?.[0];
    expect(node?.url).toBe('http://localhost');
    expect(node?.port).toBe(8332);
  });

  it('isSafeModeEnabled = nodeMode === personal-node', async () => {
    const { service } = makeNetworkService();
    await service.setConfig(PERSONAL_NODE_CONFIG);

    const config = await service.getConfig();
    const isSafeModeEnabled = config.nodeMode === 'personal-node';
    expect(isSafeModeEnabled).toBe(true);
  });

  it('resets to public-api when safe mode is deactivated', async () => {
    const { service } = makeNetworkService();
    await service.setConfig(PERSONAL_NODE_CONFIG);
    await service.setConfig({
      network: 'testnet4',
      connectivityMode: 'online',
      nodeMode: 'public-api',
    });

    const config = await service.getConfig();
    expect(config.nodeMode).toBe('public-api');
    const isSafeModeEnabled = config.nodeMode === 'personal-node';
    expect(isSafeModeEnabled).toBe(false);
  });

  it('persists config across service re-creation (same storage)', async () => {
    const secureStorage = createSecureStorageMock();
    const storage1 = new NetworkConfigStorage(secureStorage);
    const repo1 = makeNodeRepository(storage1);
    const t1 = makeConnectionTester();
    const svc1 = new NetworkService(repo1, new NodeConnectionTestUseCase(t1), new ChangeNetworkUseCase(repo1), t1);

    await svc1.setConfig(PERSONAL_NODE_CONFIG);

    // Create a new service backed by the same storage
    const storage2 = new NetworkConfigStorage(secureStorage);
    const repo2 = makeNodeRepository(storage2);
    const t2 = makeConnectionTester();
    const svc2 = new NetworkService(repo2, new NodeConnectionTestUseCase(t2), new ChangeNetworkUseCase(repo2), t2);

    const config = await svc2.getConfig();
    expect(config.nodeMode).toBe('personal-node');
  });

  it('testNodeConnection delegates to NodeConnectionTester', async () => {
    const { service, tester } = makeNetworkService();
    const result = await service.testNodeConnection(PERSONAL_NODE_CONFIG);

    expect(tester.testConnection).toHaveBeenCalledWith(PERSONAL_NODE_CONFIG);
    expect(result.status).toBe('connected');
  });

  it('testNodeConnection returns disconnected when tester fails', async () => {
    const secureStorage = createSecureStorageMock();
    const storage = new NetworkConfigStorage(secureStorage);
    const repo = makeNodeRepository(storage);
    const tester = makeConnectionTester('disconnected');
    const service = new NetworkService(
      repo,
      new NodeConnectionTestUseCase(tester),
      new ChangeNetworkUseCase(repo),
      tester,
    );

    const result = await service.testNodeConnection(PERSONAL_NODE_CONFIG);
    expect(result.status).toBe('disconnected');
  });

  it('changeNetwork updates the network while keeping nodeMode', async () => {
    const { service } = makeNetworkService();
    await service.setConfig({ network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' });

    await service.changeNetwork('mainnet');
    const config = await service.getConfig();
    expect(config.network).toBe('mainnet');
    expect(config.nodeMode).toBe('public-api');
  });
});
