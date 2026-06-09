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
  };
}

const PUBLIC_CONFIG: NetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };
const SAFE_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'personal-node',
  personalNodeUrl: 'node.local',
};

describe('NodeProviderSelector', () => {
  it('selects the public provider when safe mode is disabled', async () => {
    const configRepository = createNodeRepository(PUBLIC_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    publicProvider.getFeeRates.mockResolvedValue({
      fastSatsPerVByte: 10,
      halfHourSatsPerVByte: 8,
      hourSatsPerVByte: 6,
      economySatsPerVByte: 4,
      minimumSatsPerVByte: 1,
    });
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider);

    await selector.getFeeRates();

    expect(publicProvider.getFeeRates).toHaveBeenCalledTimes(1);
    expect(personalProvider.getFeeRates).not.toHaveBeenCalled();
  });

  it('selects the personal provider when safe mode is enabled', async () => {
    const configRepository = createNodeRepository(SAFE_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    personalProvider.getCurrentBlockHeight.mockResolvedValue(840_000);
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider);

    await selector.getCurrentBlockHeight();

    expect(personalProvider.getCurrentBlockHeight).toHaveBeenCalledTimes(1);
    expect(publicProvider.getCurrentBlockHeight).not.toHaveBeenCalled();
  });

  it('blocks public fallback when the personal provider fails in safe mode', async () => {
    const configRepository = createNodeRepository(SAFE_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    personalProvider.getUtxos.mockRejectedValue(new Error('personal node offline'));
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider);

    await expect(selector.getUtxos('tb1qaddress', 'testnet4')).rejects.toThrow('personal node offline');

    expect(personalProvider.getUtxos).toHaveBeenCalledTimes(1);
    expect(publicProvider.getUtxos).not.toHaveBeenCalled();
  });

  it('persists config and updates the personal provider cache', async () => {
    const configRepository = createNodeRepository(PUBLIC_CONFIG);
    const publicProvider = createProvider();
    const personalProvider = createPersonalProvider();
    const selector = new NodeProviderSelector(configRepository, publicProvider, personalProvider);

    await selector.setNetworkConfig(SAFE_CONFIG);

    expect(configRepository.setNetworkConfig).toHaveBeenCalledWith(SAFE_CONFIG);
    expect(personalProvider.setNetworkConfig).toHaveBeenCalledWith(SAFE_CONFIG);
  });
});
