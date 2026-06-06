import { ChangeNetworkUseCase } from '../../../src/core/domain/usecases/network/ChangeNetworkUseCase';
import type { NodeRepository } from '../../../src/core/domain/repositories/NodeRepository';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const CURRENT_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

function createRepository(config: NetworkConfig = CURRENT_CONFIG): jest.Mocked<NodeRepository> {
  return {
    getNetworkConfig: jest.fn().mockResolvedValue(config),
    setNetworkConfig: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),
  };
}

describe('ChangeNetworkUseCase', () => {
  it('switches network and persists the updated config', async () => {
    const repository = createRepository();
    const useCase = new ChangeNetworkUseCase(repository);

    await expect(useCase.execute('testnet3')).resolves.toEqual({
      ...CURRENT_CONFIG,
      network: 'testnet3',
    });

    expect(repository.setNetworkConfig).toHaveBeenCalledWith({
      ...CURRENT_CONFIG,
      network: 'testnet3',
    });
  });

  it('preserves node mode and personal node settings while switching network', async () => {
    const config: NetworkConfig = {
      network: 'testnet4',
      connectivityMode: 'online',
      nodeMode: 'personal-node',
      personalNodeUrl: 'node.local',
      personalNodePort: 3000,
      personalNodeAuthToken: 'secret',
    };
    const repository = createRepository(config);
    const useCase = new ChangeNetworkUseCase(repository);

    await useCase.execute('testnet3');

    expect(repository.setNetworkConfig).toHaveBeenCalledWith({
      ...config,
      network: 'testnet3',
    });
  });

  it('blocks network changes incompatible with the current wallet', async () => {
    const repository = createRepository();
    const useCase = new ChangeNetworkUseCase(repository);

    await expect(useCase.execute('mainnet', 'testnet4')).rejects.toMatchObject({
      code: 'NETWORK_INCOMPATIBLE',
    });
    expect(repository.setNetworkConfig).not.toHaveBeenCalled();
  });
});
