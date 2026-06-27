import { NodeProviderSelector } from '../../../src/core/infrastructure/adapters/NodeProviderSelector';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { NodeConnectionTester, NodeRepository } from '../../../src/core/domain/repositories/NodeRepository';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

function createProvider(): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

function createNodeRepository(config: NetworkConfig): jest.Mocked<NodeRepository> {
  return {
    getNetworkConfig: jest.fn().mockResolvedValue(config),
    setNetworkConfig: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),
  };
}

function createPersonalProvider(): jest.Mocked<BlockchainProvider & NodeRepository & NodeConnectionTester> {
  return {
    ...createProvider(),
    getNetworkConfig: jest.fn(),
    setNetworkConfig: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),
    testConnection: jest.fn(),
    testNode: jest.fn(),
  };
}

const BASE_CONFIG: NetworkConfig = {
  connectivityMode: 'online',
  personalNodes: [],
  allowPublicFallback: false,
};

describe('NodeProviderSelector', () => {
  it('always delegates to the multi-node provider', async () => {
    const configRepository = createNodeRepository(BASE_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    const multiNodeProvider = createProvider();
    multiNodeProvider.getFeeRates.mockResolvedValue({
      fastSatsPerVByte: 10,
      halfHourSatsPerVByte: 8,
      hourSatsPerVByte: 6,
      economySatsPerVByte: 4,
      minimumSatsPerVByte: 1,
    });
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider, multiNodeProvider);

    await selector.getFeeRates('testnet4');

    expect(multiNodeProvider.getFeeRates).toHaveBeenCalledTimes(1);
    expect(publicProvider.getFeeRates).not.toHaveBeenCalled();
  });

  it('delegates getUtxos to multi-node provider', async () => {
    const configRepository = createNodeRepository(BASE_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    const multiNodeProvider = createProvider();
    multiNodeProvider.getUtxos.mockResolvedValue([]);
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider, multiNodeProvider);

    await selector.getUtxos('tb1qaddress', 'testnet4');

    expect(multiNodeProvider.getUtxos).toHaveBeenCalledTimes(1);
    expect(publicProvider.getUtxos).not.toHaveBeenCalled();
  });

  it('errors propagate from the multi-node provider', async () => {
    const configRepository = createNodeRepository(BASE_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    const multiNodeProvider = createProvider();
    multiNodeProvider.getUtxos.mockRejectedValue(new Error('all nodes offline'));
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider, multiNodeProvider);

    await expect(selector.getUtxos('tb1qaddress', 'testnet4')).rejects.toThrow('all nodes offline');

    expect(multiNodeProvider.getUtxos).toHaveBeenCalledTimes(1);
    expect(publicProvider.getUtxos).not.toHaveBeenCalled();
  });

  it('persists config and updates the personal provider cache', async () => {
    const configRepository = createNodeRepository(BASE_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    const multiNodeProvider = createProvider();
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider, multiNodeProvider);

    const newConfig: NetworkConfig = { ...BASE_CONFIG, allowPublicFallback: true };
    await selector.setNetworkConfig(newConfig);

    expect(configRepository.setNetworkConfig).toHaveBeenCalledWith(newConfig);
    expect(personalProvider.setNetworkConfig).toHaveBeenCalledWith(newConfig);
  });

  it('getCurrentBlockHeight delegates to multi-node provider', async () => {
    const configRepository = createNodeRepository(BASE_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    const multiNodeProvider = createProvider();
    multiNodeProvider.getCurrentBlockHeight.mockResolvedValue(840_000);
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider, multiNodeProvider);

    await selector.getCurrentBlockHeight('testnet4');

    expect(multiNodeProvider.getCurrentBlockHeight).toHaveBeenCalledTimes(1);
    expect(publicProvider.getCurrentBlockHeight).not.toHaveBeenCalled();
  });
});
