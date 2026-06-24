/**
 * Integration: Safe Mode (Personal Node) Flow
 *
 * Tests the network configuration pipeline for activating/deactivating safe mode.
 * Safe mode = allowPublicFallback: false (no public API fallback when nodes configured).
 *
 * Tests: NetworkService → NodeRepository → NetworkConfigStorage → InMemorySecureStorage
 *
 * Real: NetworkConfigStorage, NetworkService, NodeConnectionTestUseCase
 * Mocked: SecureStorage (in-memory), NodeConnectionTester
 */
import { NetworkService } from '../../src/core/application/services/NetworkService';
import { NodeConnectionTestUseCase } from '../../src/core/domain/usecases/network/NodeConnectionTestUseCase';
import { NetworkConfigStorage } from '../../src/core/infrastructure/storage/NetworkConfigStorage';
import type { NodeRepository, NodeConnectionTester } from '../../src/core/domain/repositories/NodeRepository';
import type { NetworkConfig } from '../../src/core/domain/entities/Network';
import { createSecureStorageMock } from '../mocks/storage';

const DEFAULT_CONFIG: NetworkConfig = {
  connectivityMode: 'online',
  personalNodes: [],
  allowPublicFallback: false,
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

  const nodeConnectionTestUseCase = new NodeConnectionTestUseCase(tester);

  const service = new NetworkService(nodeRepository, nodeConnectionTestUseCase, tester);
  return { service, networkConfigStorage, tester };
}

describe('Integration: Safe Mode (Network Config)', () => {
  it('returns default config when no config is stored', async () => {
    const { service } = makeNetworkService();
    const config = await service.getConfig();

    expect(config.connectivityMode).toBe('online');
    expect(config.allowPublicFallback).toBe(false);
    expect(config.personalNodes).toEqual([]);
  });

  it('stores personal nodes when setConfig is called', async () => {
    const { service } = makeNetworkService();
    const configWithNode: NetworkConfig = {
      connectivityMode: 'online',
      personalNodes: [{ id: 'n1', label: 'Node', url: 'http://localhost:8332', network: 'testnet4', priority: 1 }],
      allowPublicFallback: false,
    };
    await service.setConfig(configWithNode);

    const config = await service.getConfig();
    expect(config.personalNodes).toHaveLength(1);
    expect(config.personalNodes[0].url).toBe('http://localhost:8332');
  });

  it('isSafeModeEnabled = !allowPublicFallback', async () => {
    const { service } = makeNetworkService();

    const config = await service.getConfig();
    const isSafeModeEnabled = !config.allowPublicFallback;
    expect(isSafeModeEnabled).toBe(true);
  });

  it('deactivates safe mode by enabling public fallback', async () => {
    const { service } = makeNetworkService();
    await service.setPublicFallback(true);

    const config = await service.getConfig();
    const isSafeModeEnabled = !config.allowPublicFallback;
    expect(isSafeModeEnabled).toBe(false);
  });

  it('reactivates safe mode by disabling public fallback', async () => {
    const { service } = makeNetworkService();
    await service.setPublicFallback(true);
    await service.setPublicFallback(false);

    const config = await service.getConfig();
    const isSafeModeEnabled = !config.allowPublicFallback;
    expect(isSafeModeEnabled).toBe(true);
  });

  it('persists config across service re-creation (same storage)', async () => {
    const secureStorage = createSecureStorageMock();
    const storage1 = new NetworkConfigStorage(secureStorage);
    const repo1 = makeNodeRepository(storage1);
    const t1 = makeConnectionTester();
    const svc1 = new NetworkService(repo1, new NodeConnectionTestUseCase(t1), t1);

    await svc1.setConfig({
      connectivityMode: 'online',
      personalNodes: [{ id: 'n1', label: 'Node', url: 'http://localhost:8081', network: 'testnet4', priority: 1 }],
      allowPublicFallback: false,
    });

    // Create a new service backed by the same storage
    const storage2 = new NetworkConfigStorage(secureStorage);
    const repo2 = makeNodeRepository(storage2);
    const t2 = makeConnectionTester();
    const svc2 = new NetworkService(repo2, new NodeConnectionTestUseCase(t2), t2);

    const config = await svc2.getConfig();
    expect(config.personalNodes).toHaveLength(1);
  });

  it('testNodeConnection delegates to NodeConnectionTester', async () => {
    const { service, tester } = makeNetworkService();
    const config: NetworkConfig = {
      connectivityMode: 'online',
      personalNodes: [],
      allowPublicFallback: false,
    };
    const result = await service.testNodeConnection(config);

    expect(tester.testConnection).toHaveBeenCalledWith(config);
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
      tester,
    );

    const config: NetworkConfig = { connectivityMode: 'online', personalNodes: [], allowPublicFallback: false };
    const result = await service.testNodeConnection(config);
    expect(result.status).toBe('disconnected');
  });

  describe('addPersonalNode', () => {
    it('adds a node to the personal nodes list', async () => {
      const { service } = makeNetworkService();
      await service.addPersonalNode({
        label: 'My Node',
        url: 'http://192.168.1.100:8081',
        network: 'testnet4',
        priority: 1,
      });

      const config = await service.getConfig();
      expect(config.personalNodes).toHaveLength(1);
      expect(config.personalNodes[0].url).toBe('http://192.168.1.100:8081');
    });

    it('does NOT change allowPublicFallback when adding a node', async () => {
      const { service } = makeNetworkService();
      await service.addPersonalNode({
        label: 'Mainnet Node',
        url: 'http://192.168.1.100:8081',
        network: 'mainnet',
        priority: 1,
      });

      const config = await service.getConfig();
      expect(config.allowPublicFallback).toBe(false);
    });

    it('can add multiple nodes for different networks', async () => {
      const { service } = makeNetworkService();
      await service.addPersonalNode({ label: 'Node 1', url: 'http://node1:8081', network: 'testnet4', priority: 1 });
      await service.addPersonalNode({ label: 'Node 2', url: 'http://node2:8081', network: 'mainnet', priority: 1 });

      const config = await service.getConfig();
      expect(config.personalNodes).toHaveLength(2);
    });
  });

  describe('removePersonalNode', () => {
    it('removes a node from the personal nodes list', async () => {
      const { service } = makeNetworkService();
      const node = await service.addPersonalNode({
        label: 'My Node',
        url: 'http://192.168.1.100:8081',
        network: 'testnet4',
        priority: 1,
      });

      await service.removePersonalNode(node.id);
      const config = await service.getConfig();
      expect(config.personalNodes).toHaveLength(0);
    });

    it('does NOT change allowPublicFallback when removing a node', async () => {
      const { service } = makeNetworkService();
      const node = await service.addPersonalNode({
        label: 'My Node',
        url: 'http://192.168.1.100:8081',
        network: 'testnet4',
        priority: 1,
      });

      await service.removePersonalNode(node.id);
      const config = await service.getConfig();
      expect(config.allowPublicFallback).toBe(false);
    });
  });

  describe('setPublicFallback', () => {
    it('enables public fallback', async () => {
      const { service } = makeNetworkService();
      await service.setPublicFallback(true);
      expect((await service.getConfig()).allowPublicFallback).toBe(true);
    });

    it('disables public fallback (activates safe mode)', async () => {
      const { service } = makeNetworkService();
      await service.setPublicFallback(true);
      await service.setPublicFallback(false);
      expect((await service.getConfig()).allowPublicFallback).toBe(false);
    });
  });
});
